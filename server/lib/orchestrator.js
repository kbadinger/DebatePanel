// Simplified orchestrator for Railway service
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const sentryModule = require('./sentry');

class Orchestrator {
  constructor(models, config = {}) {
    this.models = models;
    this.config = config;
    this.responses = [];
    
    // Initialize API clients
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
    this.anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;
    const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    this.google = googleApiKey ? new GoogleGenerativeAI(googleApiKey) : null;
    this.perplexity = process.env.PERPLEXITY_API_KEY
      ? new OpenAI({
          apiKey: process.env.PERPLEXITY_API_KEY,
          baseURL: process.env.PERPLEXITY_BASE_URL || 'https://api.perplexity.ai'
        })
      : null;
    this.deepseek = process.env.DEEPSEEK_API_KEY
      ? new OpenAI({
          apiKey: process.env.DEEPSEEK_API_KEY,
          baseURL: 'https://api.deepseek.com/v1'
        })
      : null;
    this.mistral = process.env.MISTRAL_API_KEY
      ? new OpenAI({
          apiKey: process.env.MISTRAL_API_KEY,
          baseURL: 'https://api.mistral.ai/v1'
        })
      : null;
    this.meta = process.env.OPENROUTER_API_KEY
      ? new OpenAI({
          apiKey: process.env.OPENROUTER_API_KEY,
          baseURL: 'https://openrouter.ai/api/v1',
          defaultHeaders: {
            'HTTP-Referer': process.env.SITE_URL || 'https://debatepanel.com',
            'X-Title': 'DebatePanel'
          }
        })
      : null;
    this.kimi = process.env.KIMI_API_KEY
      ? new OpenAI({
          apiKey: process.env.KIMI_API_KEY,
          baseURL: 'https://api.moonshot.ai/v1'
        })
      : null;
  }

  async runRound(roundNumber, topic, description, isConsensusMode = false, onModelComplete = null) {
    const responses = [];

    for (const model of this.models) {
      try {
        const response = await this.getModelResponse(
          model,
          roundNumber,
          topic,
          description,
          isConsensusMode
        );

        const responseData = {
          modelId: model.id,
          provider: model.provider,
          content: response.content,
          position: response.position || 'neutral',
          confidence: response.confidence || 75,
          round: roundNumber
        };

        responses.push(responseData);
        this.responses.push(response);

        // Call callback immediately after model completes (keeps stream alive)
        if (onModelComplete) {
          await onModelComplete(responseData);
        }
      } catch (error) {
        console.error(`Error getting response from ${model.id}:`, error);

        // Capture error in Sentry with context (if Sentry is enabled)
        if (sentryModule.isSentryEnabled) {
          sentryModule.Sentry.captureException(error, {
            tags: {
              model: model.id,
              provider: model.provider,
              round: roundNumber
            },
            contexts: {
              debate: {
                topic,
                round: roundNumber,
                model: model.id
              }
            }
          });
        }

        const errorResponse = {
          modelId: model.id,
          provider: model.provider,
          content: `Error: Unable to get response - ${error.message}`,
          position: 'error',
          confidence: 0,
          round: roundNumber
        };

        responses.push(errorResponse);

        // Call callback for error responses too
        if (onModelComplete) {
          await onModelComplete(errorResponse);
        }
      }
    }

    return { responses };
  }

  async getModelResponse(model, round, topic, description, isConsensusMode) {
    const prompt = this.buildPrompt(round, topic, description, isConsensusMode, model);
    
    try {
      let content = '';
      
      // Route to appropriate provider
      if (model.provider === 'openai' && this.openai) {
        const isReasoningModel = typeof model.name === 'string'
          && (model.name.includes('gpt-5') || model.name.includes('gpt-4.2') || model.name.includes('gpt-4o-reasoning'));

        // gpt-5-chat-latest is the working variant (base gpt-5 returns empty content)
        const isGpt5ChatVariant = model.name === 'gpt-5-chat-latest';

        // gpt-5-pro requires Responses API instead of Chat Completions API
        const usesResponsesAPI = model.name === 'gpt-5-pro';

        let completion;

        if (usesResponsesAPI) {
          // Use Responses API for gpt-5-pro
          console.log('[OpenAI] Using Responses API for', model.name);
          const responsePayload = {
            model: model.name,
            input: prompt,
            max_output_tokens: 8000  // Increased from 1500 - GPT-5 Pro uses lots of tokens for reasoning
            // Note: Responses API doesn't support temperature parameter
          };

          completion = await this.openai.responses.create(responsePayload);
          console.log(`[OpenAI Responses] ${model.name} status:`, completion?.status);

          // Check if response was incomplete
          if (completion?.status === 'incomplete') {
            console.warn(`[OpenAI Responses] ${model.name} incomplete:`, completion?.incomplete_details);
          }

          // Responses API puts the final text in output_text field
          content = completion?.output_text || '';

          // Fallback: Try to extract from output array if output_text is empty
          if (!content && completion?.output) {
            const output = completion.output;
            if (Array.isArray(output) && output.length > 0) {
              content = output
                .map(part => part.text || part.content || '')
                .filter(text => text.length > 0)
                .join('\n');
            }
          }

          // Log the extracted content (consistent with other providers)
          console.log(`[OpenAI Responses] ${model.name} final content length:`, content.length);
          if (content.length > 0 && content.length < 200) {
            // For short content, log the full text (might indicate an error)
            console.log(`[OpenAI Responses] ${model.name} content:`, content);
          }

          if (!content || content.length === 0) {
            console.error(`[OpenAI Responses] ${model.name} no content - full response:`, JSON.stringify(completion));
            content = '(No content returned - response may have been incomplete)';
          }

          console.log(`[OpenAI Responses] ${model.name} final content length:`, content.length);
        } else {
          // Use Chat Completions API for other models
          const requestPayload = {
            model: model.name,
            messages: [
              { role: 'system', content: 'You are participating in a structured debate.' },
              { role: 'user', content: prompt }
            ]
          };

          // gpt-5-chat-latest accepts temperature, but some reasoning models don't
          if (!isReasoningModel || isGpt5ChatVariant) {
            requestPayload.temperature = 0.7;
          }

          // All gpt-5 variants need max_completion_tokens
          if (isReasoningModel) {
            requestPayload.max_completion_tokens = 1500;
          } else {
            requestPayload.max_tokens = 1500;
          }

          try {
            completion = await this.openai.chat.completions.create(requestPayload);
          } catch (err) {
            if (!isReasoningModel && err?.message?.includes("max_tokens") && !requestPayload.max_completion_tokens) {
              delete requestPayload.max_tokens;
              requestPayload.max_completion_tokens = 1500;
              completion = await this.openai.chat.completions.create(requestPayload);
            } else {
              throw err;
            }
          }
          const choice = completion?.choices?.[0];
          console.log(`[OpenAI] ${model.name} raw message:`, JSON.stringify(choice?.message));
          content = this.extractMessageContent(choice);
        }
        
      } else if (model.provider === 'anthropic' && this.anthropic) {
        const response = await this.anthropic.messages.create({
          model: model.name,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1500,
          temperature: 0.7
        });
        content = response.content[0].text;
        
      } else if (model.provider === 'google' && this.google) {
        const genModel = this.google.getGenerativeModel({ model: model.name });
        const result = await genModel.generateContent(prompt);
        content = result.response.text();
        
      } else if (model.provider === 'perplexity' && this.perplexity) {
        const completion = await this.perplexity.chat.completions.create({
          model: model.name,
          messages: [
            { role: 'system', content: 'You are participating in a structured debate.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 1500,
          temperature: 0.7
        });
        const choice = completion?.choices?.[0];
        console.log(`[Perplexity] ${model.name} raw message:`, JSON.stringify(choice?.message));
        content = this.extractMessageContent(choice) || '(No content returned by Perplexity)';
      } else if (model.provider === 'perplexity') {
        throw new Error('Perplexity API key not configured');
      } else if (model.provider === 'xai' && process.env.XAI_API_KEY) {
        const grokClient = new OpenAI({
          apiKey: process.env.XAI_API_KEY,
          baseURL: process.env.XAI_BASE_URL || 'https://api.x.ai/v1'
        });

        const completion = await grokClient.chat.completions.create({
          model: model.name,
          messages: [
            { role: 'system', content: 'You are participating in a structured debate.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 1500,
          temperature: 0.7
        });
        const choice = completion?.choices?.[0];
        console.log(`[XAI] ${model.name} raw message:`, JSON.stringify(choice?.message));
        content = this.extractMessageContent(choice) || '(No content returned by X.AI)';

      } else if (model.provider === 'deepseek' && this.deepseek) {
        const completion = await this.deepseek.chat.completions.create({
          model: model.name,
          messages: [
            { role: 'system', content: 'You are participating in a structured debate.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 1500,
          temperature: 0.7
        });
        const choice = completion?.choices?.[0];
        console.log(`[DeepSeek] ${model.name} raw message:`, JSON.stringify(choice?.message));
        content = this.extractMessageContent(choice) || '(No content returned by DeepSeek)';

      } else if (model.provider === 'mistral' && this.mistral) {
        const completion = await this.mistral.chat.completions.create({
          model: model.name,
          messages: [
            { role: 'system', content: 'You are participating in a structured debate.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 1500,
          temperature: 0.7
        });
        const choice = completion?.choices?.[0];
        console.log(`[Mistral] ${model.name} raw message:`, JSON.stringify(choice?.message));
        content = this.extractMessageContent(choice) || '(No content returned by Mistral)';

      } else if (model.provider === 'meta' && this.meta) {
        const completion = await this.meta.chat.completions.create({
          model: model.name,
          messages: [
            { role: 'system', content: 'You are participating in a structured debate.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 1500,
          temperature: 0.7
        });
        const choice = completion?.choices?.[0];
        console.log(`[Meta] ${model.name} raw message:`, JSON.stringify(choice?.message));
        content = this.extractMessageContent(choice) || '(No content returned by Meta)';

      } else if (model.provider === 'kimi' && this.kimi) {
        const completion = await this.kimi.chat.completions.create({
          model: model.name,
          messages: [
            { role: 'system', content: 'You are participating in a structured debate.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 1500,
          temperature: 0.7
        });
        const choice = completion?.choices?.[0];
        console.log(`[Kimi] ${model.name} raw message:`, JSON.stringify(choice?.message));
        content = this.extractMessageContent(choice) || '(No content returned by Kimi)';

      } else {
        throw new Error(`Provider ${model.provider} not configured`);
      }

      // Debug: Check if content is actually present
      console.log(`[Orchestrator] ${model.id} content check - length: ${content?.length}, type: ${typeof content}`);
      if (!content || content.length === 0 || content === '(No content returned)') {
        console.error(`[Orchestrator] ${model.id} WARNING: Empty or missing content!`);
      }

      // Analyze the response
      const analysis = this.analyzeResponse(content);

      return {
        modelId: model.id,
        provider: model.provider,
        content,
        position: analysis.position,
        confidence: analysis.confidence
      };
      
    } catch (error) {
      console.error(`Error calling ${model.provider} API:`, error);
      throw error;
    }
  }

  extractMessageContent(choice) {
    if (!choice?.message) {
      return '';
    }

    const { message } = choice;

    if (typeof message.content === 'string') {
      return message.content;
    }

    if (Array.isArray(message.content)) {
      const parts = message.content
        .map(part => {
          if (!part) return '';
          if (typeof part === 'string') return part;
          if (part.type === 'output_text' || part.type === 'text' || part.type === 'message') {
            return part.text || part.content || '';
          }
          if (part.type === 'thought' && part.thought) {
            return part.thought;
          }
          if (part.type === 'reasoning' && Array.isArray(part.reasoning)) {
            return part.reasoning.map(r => r.thought || r.text || '').join('\n');
          }
          if (part.type === 'tool_call' && part.tool_calls) {
            return JSON.stringify(part.tool_calls);
          }
          if (part.text) return part.text;
          if (part.content) return part.content;
          return '';
        })
        .filter(Boolean);

      if (parts.length > 0) {
        return parts.join('\n').trim();
      }
    }

    if (message.refusal) {
      return message.refusal;
    }

    if (message.tool_calls) {
      return JSON.stringify(message.tool_calls);
    }

    return '';
  }

  buildPrompt(round, topic, description, isConsensusMode, model = null) {
    // Check if this model is the Challenger
    if (model?.isChallenger) {
      return this.buildChallengerPrompt(round, topic, description);
    }

    let prompt = `Round ${round} of debate on: "${topic}"\n\n`;

    if (description) {
      prompt += `Context: ${description}\n\n`;
    }

    if (round === 1) {
      prompt += isConsensusMode
        ? 'Provide your initial perspective on this topic. Take a clear position and explain your reasoning.'
        : 'Present your strongest argument on this topic. Be decisive and clear.';
    } else {
      prompt += 'Consider the previous arguments and ';
      prompt += isConsensusMode
        ? 'work toward finding common ground while maintaining your perspective.'
        : 'strengthen your position or acknowledge stronger arguments.';

      // Add previous responses summary
      if (this.responses.length > 0) {
        prompt += '\n\nPrevious arguments included:\n';
        const recentResponses = this.responses.slice(-this.models.length);
        recentResponses.forEach(r => {
          prompt += `- ${r.position}: Key point from their argument\n`;
        });
      }
    }

    prompt += '\n\nProvide a clear, concise response (max 500 words).';

    return prompt;
  }

  buildChallengerPrompt(round, topic, description) {
    let prompt = `Round ${round} - CHALLENGER ROLE on: "${topic}"\n\n`;

    if (description) {
      prompt += `Context: ${description}\n\n`;
    }

    if (round === 1) {
      prompt += `You are the CHALLENGER in this debate. Your role is unique and critical.

YOUR MISSION: FORGE STRONGER ANSWERS THROUGH FIRE

You are not here to reach a conclusion. You are here to STRESS-TEST every conclusion others reach.
Your job is to find the failure modes, edge cases, and hidden assumptions that could make their advice DANGEROUS.

CHALLENGER MINDSET:
- You are the friend who asks "but what if it goes wrong?"
- You are the advisor who finds the risks others miss
- You are the voice that prevents costly mistakes
- Your success = finding REAL problems that would change the decision

WHAT YOU MUST DO:
1. FIND HIDDEN ASSUMPTIONS: What are they taking for granted that might not be true?
2. IDENTIFY FAILURE SCENARIOS: Under what realistic conditions does this advice fail?
3. STRESS-TEST THE NUMBERS: Are the calculations robust? What if inputs change?
4. CONSIDER WORST CASES: What happens if Murphy's Law applies?
5. QUESTION THE TIMELINE: What changes in 6 months, 2 years, 5 years?

YOUR ATTACKS MUST BE:
- REALISTIC: Not absurd hypotheticals, but plausible scenarios
- SPECIFIC: "What if X happens" not vague "there are risks"
- CONSTRUCTIVE: Identify what would need to be true for the advice to be safe
- QUANTIFIED: "If income drops 20%" not just "if income drops"

YOU ARE NOT a nihilist or troll. You are a steel-man stress tester who makes the final answer IRON-FORGED.

At the end, state:
Stance: Challenger (stress-testing all positions)
Confidence: [0-100]% that I've identified genuine risks`;
    } else {
      prompt += `CHALLENGER CONTINUES STRESS-TESTING

Review what others have said. Have they addressed your previous challenges?
- If YES: Acknowledge it, then find the NEXT layer of risk
- If NO: Press harder on the unaddressed vulnerabilities
- If PARTIALLY: Point out what's still missing

NEW ATTACKS FOR THIS ROUND:
1. COMPOUND RISKS: What if multiple challenges hit at once?
2. TIMING RISKS: What if the worst happens at the worst possible time?
3. SECOND-ORDER EFFECTS: What consequences follow from the first problem?
4. RECOVERY PATHS: If this goes wrong, can they recover? How long? At what cost?`;

      // Add previous responses
      if (this.responses.length > 0) {
        prompt += '\n\nPrevious arguments to stress-test:\n';
        const recentResponses = this.responses.slice(-this.models.length);
        recentResponses.forEach(r => {
          prompt += `- ${r.position}: ${r.content?.substring(0, 200)}...\n`;
        });
      }

      prompt += `\n\nREMEMBER: You're not trying to WIN. You're trying to make the final answer BULLETPROOF.

At the end, state:
Stance: Challenger (continuing stress-test)
Confidence: [0-100]% that remaining risks have been identified`;
    }

    return prompt;
  }

  analyzeResponse(content) {
    // Ensure content is a string
    const contentStr = typeof content === 'string' ? content : String(content || '');
    const lowerContent = contentStr.toLowerCase();
    
    // Simple position detection
    let position = 'neutral';
    let confidence = 75;
    
    if (lowerContent.includes('strongly agree') || lowerContent.includes('absolutely')) {
      position = 'strongly-agree';
      confidence = 90;
    } else if (lowerContent.includes('agree') || lowerContent.includes('support')) {
      position = 'agree';
      confidence = 75;
    } else if (lowerContent.includes('strongly disagree') || lowerContent.includes('completely oppose')) {
      position = 'strongly-disagree';
      confidence = 90;
    } else if (lowerContent.includes('disagree') || lowerContent.includes('oppose')) {
      position = 'disagree';
      confidence = 75;
    } else if (lowerContent.includes('balanced') || lowerContent.includes('both sides')) {
      position = 'neutral';
      confidence = 60;
    }
    
    return { position, confidence };
  }

  async generateSynthesis(debateId) {
    if (!this.responses || this.responses.length === 0) {
      return 'No responses available for synthesis.';
    }

    try {
      // Get debate from database to get topic
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      const debate = await prisma.debate.findUnique({
        where: { id: debateId },
        include: {
          debateRounds: {
            include: { responses: true },
            orderBy: { roundNumber: 'asc' }
          }
        }
      });

      if (!debate || debate.debateRounds.length === 0) {
        return 'No debate rounds available for synthesis.';
      }

      // Get valid responses from the latest round
      const isValidResponse = (r) => {
        return r &&
               !r.content.includes('Error:') &&
               !r.content.includes('Timeout') &&
               r.confidence > 0;
      };

      let latestRound = null;
      for (let i = debate.debateRounds.length - 1; i >= 0; i--) {
        const round = debate.debateRounds[i];
        const validResponses = round.responses.filter(isValidResponse);
        if (validResponses.length > 0) {
          latestRound = round;
          break;
        }
      }

      if (!latestRound) {
        return 'No valid responses available for synthesis.';
      }

      const validResponses = latestRound.responses.filter(isValidResponse);

      // Build synthesis prompt - focused on extracting THE ANSWER
      const participantArguments = validResponses.map(r => `
${r.modelId}:
${r.content.substring(0, 1000)}${r.content.length > 1000 ? '...' : ''}
`).join('\n---\n');

      const prompt = `Synthesize this debate into a clear, actionable summary.

Topic: ${debate.topic}

Participant Arguments:
${participantArguments}

Your task: Extract THE ANSWER and make it crystal clear.

Provide a synthesis in this EXACT format:

## THE ANSWER
[State the clear consensus/recommendation in 1-2 sentences. Be specific and actionable. If they agreed on "purple", say "Purple". If they agreed to "attend the conference", say "Yes, attend the conference". NO VAGUE META-COMMENTARY.]

## WHY
[3-5 bullet points of the key reasons supporting this answer]

## CONCERNS / OBJECTIONS
[2-4 bullet points of any concerns, caveats, or dissenting views raised]
[If there were NO meaningful objections, write: "No significant objections raised."]

## BOTTOM LINE
[One sentence actionable takeaway]

CRITICAL: Do NOT write meta-commentary like "participants agreed" or "consensus emerged". Extract the ACTUAL SUBSTANCE of what they decided. If the debate was about "which color for sex", your answer should be the COLOR, not "participants discussed color preferences".`;

      // Use Claude for synthesis (fast, reliable, good at following format)
      let synthesisText;

      if (this.anthropic) {
        console.log('[Synthesis] Using Claude Sonnet for synthesis');
        const response = await this.anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1500,
          temperature: 0.3
        });
        synthesisText = response.content[0].text;
      } else if (this.openai) {
        console.log('[Synthesis] Using GPT-4o for synthesis');
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1500,
          temperature: 0.3
        });
        synthesisText = response.choices[0].message.content;
      } else {
        throw new Error('No AI provider available for synthesis generation');
      }

      await prisma.$disconnect();
      return synthesisText;

    } catch (error) {
      console.error('Failed to generate AI-powered synthesis:', error);
      // Fallback to simple text extraction
      const recentResponses = this.responses.slice(-3);
      return `## Debate Summary

${this.responses.length} participants shared their perspectives across multiple rounds.

Recent key points:
${recentResponses.map(r => `- ${r.modelId}: ${r.content.substring(0, 200)}...`).join('\n')}

Note: AI synthesis failed. See full debate transcript above for complete details.`;
    }
  }

  async generateJudgeAnalysis(debateId, judgeModel, isConsensusMode) {
    try {
      // Get all debate responses from database
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      const debate = await prisma.debate.findUnique({
        where: { id: debateId },
        include: {
          debateRounds: {
            include: { responses: true },
            orderBy: { roundNumber: 'asc' }
          }
        }
      });

      if (!debate || debate.debateRounds.length === 0) {
        return {
          analysis: `Unable to provide judge analysis: No debate rounds were completed.`
        };
      }

      // Get the latest round with valid responses
      const isValidResponse = (r) => {
        return r &&
               !r.content.includes('Error:') &&
               !r.content.includes('Timeout') &&
               r.confidence > 0;
      };

      let analysisRound = null;
      for (let i = debate.debateRounds.length - 1; i >= 0; i--) {
        const round = debate.debateRounds[i];
        const validResponses = round.responses.filter(isValidResponse);
        if (validResponses.length > 0) {
          analysisRound = round;
          break;
        }
      }

      if (!analysisRound) {
        return {
          analysis: `Unable to provide judge analysis: All models failed to complete the debate successfully.`
        };
      }

      const validResponses = analysisRound.responses.filter(isValidResponse);
      const failedCount = analysisRound.responses.length - validResponses.length;

      // Build comprehensive judge prompt
      const finalPositions = validResponses.map(r => ({
        model: r.modelId,
        position: r.position || 'Not specified',
        confidence: r.confidence,
        content: r.content
      }));

      const prompt = `As the judge, evaluate the QUALITY OF ARGUMENTS in this debate.

Topic: ${debate.topic}

${failedCount > 0 ? `Note: ${failedCount} model(s) failed to respond. Analysis based on ${validResponses.length} successful participant(s).\n\n` : ''}Available Round ${analysisRound.roundNumber} Positions:
${finalPositions.map(p => `
${p.model}:
- Position: ${p.position}
- Confidence: ${p.confidence}%
- Full Argument: ${p.content.substring(0, 500)}...
`).join('\n')}

CRITICAL: Judge ONLY the quality of arguments, NOT whether you agree with the conclusion.
- There is no objectively "correct" answer to most debates
- A minority position with excellent reasoning should outscore a majority position with weak reasoning
- NEVER use phrases like "wrong conclusion" - evaluate REASONING, not positions

Your PRIMARY task:
1. Based on argument quality, which position is BEST SUPPORTED?
2. Give a clear recommendation someone could act on
3. Acknowledge when the opposite position might be valid

Your SECONDARY tasks:
${isConsensusMode
  ? `4. IDENTIFY LEADING CONTRIBUTOR: Who made the strongest arguments?
5. Score each participant (0-100) based on:
   - Quality of reasoning and logic
   - Strength of evidence presented
   - How well they addressed counter-arguments`
  : `4. DECLARE A WINNER: Who made the STRONGEST case based on argument quality?
5. Score each participant (0-100) based on:
   - Quality of reasoning (NOT agreement with conclusion)
   - Strength of evidence presented
   - How well they addressed counter-arguments`}

Provide:
- YOUR RECOMMENDATION (in 1-2 clear sentences)
- WHY this is best supported by the arguments
- WHEN THE OPPOSITE MIGHT BE BETTER (acknowledge valid scenarios)
- ${isConsensusMode ? 'LEADING CONTRIBUTOR' : 'WINNER'}: Who argued best
- SCORES: Rate each participant on ARGUMENT QUALITY (format: "ModelName: XX/100")

Judge the arguments, not the conclusions.`;

      // Call the judge model
      let judgeResponse;

      console.log(`[Judge] Using judge model: ${judgeModel}`);

      // Normalize judge model name (handle shorthand names)
      let normalizedJudgeModel = judgeModel;
      if (judgeModel === 'claude-3-5-sonnet') {
        // Use latest Claude 4 Sonnet (Claude 3.5 may not be available on all API keys)
        normalizedJudgeModel = 'claude-sonnet-4-20250514';
      } else if (judgeModel === 'gpt-4o') {
        normalizedJudgeModel = 'gpt-4o';
      } else if (judgeModel && judgeModel.includes('gpt-5')) {
        // GPT-5 models pass through as-is
        normalizedJudgeModel = judgeModel;
      }

      console.log(`[Judge] Normalized to: ${normalizedJudgeModel}`);

      if (normalizedJudgeModel.includes('claude')) {
        if (!this.anthropic) {
          throw new Error('Anthropic API not configured for judge model');
        }
        const response = await this.anthropic.messages.create({
          model: normalizedJudgeModel,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1500,
          temperature: 0.3
        });
        judgeResponse = response.content[0].text;
      } else if (normalizedJudgeModel.includes('gpt')) {
        if (!this.openai) {
          throw new Error('OpenAI API not configured for judge model');
        }

        // GPT-5 Pro uses Responses API
        if (normalizedJudgeModel === 'gpt-5-pro') {
          console.log('[Judge] Using Responses API for gpt-5-pro');
          const response = await this.openai.responses.create({
            model: normalizedJudgeModel,
            input: prompt,
            max_output_tokens: 2500
          });
          judgeResponse = response.output_text || '';
          if (!judgeResponse && response.output && Array.isArray(response.output)) {
            judgeResponse = response.output.map(part => part.text || part.content || '').join('\n');
          }
        } else {
          // Standard Chat Completions API for other GPT models
          const response = await this.openai.chat.completions.create({
            model: normalizedJudgeModel,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1500,
            temperature: 0.3
          });
          judgeResponse = response.choices[0].message.content;
        }
      } else {
        // Default to first available client
        if (this.anthropic) {
          const response = await this.anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1500,
            temperature: 0.3
          });
          judgeResponse = response.content[0].text;
        } else if (this.openai) {
          const response = await this.openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1500,
            temperature: 0.3
          });
          judgeResponse = response.choices[0].message.content;
        } else {
          throw new Error('No AI API configured for judge analysis');
        }
      }

      // Add note about partial results if some models failed
      if (failedCount > 0) {
        judgeResponse += `\n\n---\n*Note: This analysis is based on ${validResponses.length} of ${analysisRound.responses.length} models due to ${failedCount} failure(s) in Round ${analysisRound.roundNumber}.*`;
      }

      // Extract winner and scores
      const winner = this.extractWinner(judgeResponse, finalPositions);
      const scores = this.extractScores(judgeResponse, finalPositions);

      await prisma.$disconnect();

      return {
        analysis: judgeResponse,
        winner,
        scores
      };

    } catch (error) {
      console.error('Error generating judge analysis:', error);
      return {
        analysis: `Error generating judge analysis: ${error.message}`
      };
    }
  }

  extractWinner(analysisText, participants) {
    const winnerPatterns = [
      /WINNER:\s*([^\n]+)/i,
      /Winner:\s*([^\n]+)/i,
      /The winner is:\s*([^\n]+)/i,
      /LEADING CONTRIBUTOR:\s*([^\n]+)/i,
      /Leading Contributor:\s*([^\n]+)/i,
      /best arguments?.*presented by\s+([^\n,]+)/i
    ];

    for (const pattern of winnerPatterns) {
      const match = analysisText.match(pattern);
      if (match) {
        const winnerName = match[1].trim();

        const participant = participants.find(p =>
          p.model.toLowerCase().includes(winnerName.toLowerCase()) ||
          winnerName.toLowerCase().includes(p.model.toLowerCase())
        );

        if (participant) {
          const reasonMatch = analysisText.match(new RegExp(`${winnerName}[^.]*because([^.]+)`, 'i'));
          const reason = reasonMatch ? reasonMatch[1].trim() : 'Best overall arguments and reasoning';

          return {
            id: participant.model,
            name: participant.model,
            type: 'model',
            reason
          };
        }
      }
    }

    // Fallback: highest confidence
    const highestConfidence = participants.reduce((max, p) =>
      p.confidence > max.confidence ? p : max
    );

    if (highestConfidence && highestConfidence.confidence > 80) {
      return {
        id: highestConfidence.model,
        name: highestConfidence.model,
        type: 'model',
        reason: 'Highest conviction and confidence'
      };
    }

    return undefined;
  }

  extractScores(analysisText, participants) {
    const scores = {};

    const scorePatterns = [
      /([^\n:]+):\s*(\d+)(?:\/100|\s*points?)?/g,
      /Score.*?([^\n:]+):\s*(\d+)/gi,
      /([^\n]+)\s*-\s*(\d+)%/g
    ];

    for (const pattern of scorePatterns) {
      const matches = [...analysisText.matchAll(pattern)];
      for (const match of matches) {
        const name = match[1].trim();
        const score = parseInt(match[2]);

        if (score >= 0 && score <= 100) {
          const participant = participants.find(p => {
            const modelName = p.model.toLowerCase();
            const scoreName = name.toLowerCase().trim();
            return modelName === scoreName ||
                   modelName.includes(scoreName) ||
                   scoreName.includes(modelName);
          });

          if (participant && !scores[participant.model]) {
            scores[participant.model] = score;
          }
        }
      }
    }

    return scores;
  }
}

module.exports = { Orchestrator };





