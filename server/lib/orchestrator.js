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

    // State for iron-forged debates
    this.roundSyntheses = {};      // { roundNumber: "synthesis text" }
    this.challengerResponses = {}; // { roundNumber: "challenger text" }
    
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

  async runRound(roundNumber, topic, description, isConsensusMode = false, onModelComplete = null, debateStyle = null) {
    const responses = [];

    for (const model of this.models) {
      try {
        const response = await this.getModelResponse(
          model,
          roundNumber,
          topic,
          description,
          isConsensusMode,
          debateStyle
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
        this.responses.push(responseData);  // Use responseData which includes round number

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

  async getModelResponse(model, round, topic, description, isConsensusMode, debateStyle = null) {
    const prompt = this.buildPrompt(round, topic, description, isConsensusMode, model, debateStyle);
    
    try {
      let content = '';
      
      // Route to appropriate provider
      if (model.provider === 'openai' && this.openai) {
        const isReasoningModel = typeof model.name === 'string'
          && (model.name.includes('gpt-5') || model.name.includes('gpt-4.2') || model.name.includes('gpt-4o-reasoning'));

        // gpt-5-chat-latest and gpt-5.2-chat-latest are the working chat variants
        const isGpt5ChatVariant = model.name === 'gpt-5-chat-latest' || model.name === 'gpt-5.2-chat-latest';

        // gpt-5-pro and gpt-5.2-pro require Responses API instead of Chat Completions API
        const usesResponsesAPI = model.name === 'gpt-5-pro' || model.name === 'gpt-5.2-pro';

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

  buildPrompt(round, topic, description, isConsensusMode, model = null, debateStyle = null) {
    // Check if this model is the Challenger
    if (model?.isChallenger) {
      return this.buildChallengerPrompt(round, topic, description);
    }

    // Check for ideation mode
    if (debateStyle === 'ideation') {
      return this.buildIdeationPrompt(round, topic, description, model);
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

      // === IRON-FORGED: Add previous round syntheses (compressed history) ===
      const hasSyntheses = Object.keys(this.roundSyntheses).length > 0;
      if (hasSyntheses) {
        prompt += '\n\n=== DEBATE EVOLUTION ===\n';
        for (let r = 1; r < round; r++) {
          if (this.roundSyntheses[r]) {
            prompt += `Round ${r}: ${this.roundSyntheses[r]}\n`;
          }
        }
        prompt += `=== END DEBATE EVOLUTION ===\n`;
      }

      // === IRON-FORGED: Add Challenger concerns to address ===
      const previousRound = round - 1;
      if (this.challengerResponses[previousRound]) {
        prompt += `\n=== CHALLENGER'S CONCERNS (address these) ===\n`;
        prompt += `${this.challengerResponses[previousRound]}\n`;
        prompt += `\nYou MUST address these challenges in your response. If you think a concern has been adequately addressed, explain how. If it's a valid concern, adapt your position accordingly.\n`;
        prompt += `=== END CHALLENGER'S CONCERNS ===\n`;
      }

      // Add THIS MODEL's own position history (prevents flip-flopping)
      if (model && this.responses.length > 0) {
        const myHistory = this.responses.filter(r => r.modelId === model.id);
        if (myHistory.length > 0) {
          const latest = myHistory[myHistory.length - 1];
          prompt += `\n\n=== YOUR PREVIOUS POSITION ===\n`;
          prompt += `You argued "${latest.position}" with ${latest.confidence || 75}% confidence.\n`;
          prompt += `Your key argument was: ${latest.content?.substring(0, 300) || 'Not recorded'}...\n`;
          prompt += `\nIMPORTANT: If you change your position, you MUST explain WHY - what new information or argument changed your mind? Unexplained position changes undermine your credibility.\n`;
          prompt += `=== END YOUR PREVIOUS POSITION ===\n`;
        }
      }

      // Add previous responses summary from OTHER models (most recent round only for token efficiency)
      if (this.responses.length > 0) {
        prompt += '\n\nOther participants argued in the last round:\n';
        const recentResponses = this.responses.slice(-this.models.length);
        recentResponses.forEach(r => {
          // Skip this model's own response (already shown above)
          if (model && r.modelId === model.id) return;
          // Include actual argument content, truncated for context management
          const truncatedContent = r.content ? r.content.substring(0, 400) : 'No response recorded';
          prompt += `- ${r.modelId} (${r.position}): ${truncatedContent}...\n\n`;
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
          const truncatedContent = r.content ? r.content.substring(0, 400) : 'No response recorded';
          prompt += `- ${r.modelId} (${r.position}): ${truncatedContent}...\n\n`;
        });
      }

      prompt += `\n\nREMEMBER: You're not trying to WIN. You're trying to make the final answer BULLETPROOF.

At the end, state:
Stance: Challenger (continuing stress-test)
Confidence: [0-100]% that remaining risks have been identified`;
    }

    return prompt;
  }

  // ========== IDEATION MODE PROMPTS ==========

  buildIdeationPrompt(round, topic, description, model) {
    // Route to round-specific ideation prompt
    switch (round) {
      case 1:
        return this.buildIdeationRound1Diverge(topic, description, model);
      case 2:
        return this.buildIdeationRound2CrossPollinate(topic, description, model);
      case 3:
        return this.buildIdeationRound3Deathmatch(topic, description, model);
      case 4:
        return this.buildIdeationRound4VoteDefend(topic, description, model);
      case 5:
      case 6:
        return this.buildIdeationRound5_6Refine(round, topic, description, model);
      case 7:
        return this.buildIdeationRound7FinalShowdown(topic, description, model);
      default:
        // Fallback for rounds beyond 7
        return this.buildIdeationRound5_6Refine(round, topic, description, model);
    }
  }

  buildIdeationRound1Diverge(topic, description, model) {
    let prompt = `IDEATION ROUND 1: DIVERGE

Topic: "${topic}"
${description ? `Context: ${description}\n` : ''}

YOUR MISSION: Generate 3-4 DISTINCT ideas that could solve or address this topic.

RULES FOR THIS ROUND:
1. Each idea MUST be meaningfully different from the others
2. Format each idea as a numbered list:
   1. [IDEA TITLE]: [2-3 sentence description of the idea and why it could work]
   2. [IDEA TITLE]: [2-3 sentence description]
   ...etc
3. Include at least ONE unconventional or contrarian idea
4. Don't self-censor - wild ideas often contain seeds of brilliance
5. Be specific enough that someone could understand and evaluate the idea

IMPORTANT: This is a brainstorming phase. Quantity and diversity of thinking matters more than perfection. Push beyond your first instinct.

At the end, state:
Stance: Divergent thinking
Confidence: [0-100]% in the overall quality of these initial ideas`;

    return prompt;
  }

  buildIdeationRound2CrossPollinate(topic, description, model) {
    let prompt = `IDEATION ROUND 2: CROSS-POLLINATE

Topic: "${topic}"
${description ? `Context: ${description}\n` : ''}

You've seen all the ideas generated in Round 1.

YOUR MISSION: Build on the collective creativity. You may:
- ADOPT: Take an idea you like from another participant and champion it
- COMBINE: Merge two or more ideas into something stronger
- IMPROVE: Take any idea and make it better with specific enhancements
- EVOLVE: Use an idea as inspiration for something new

`;

    // Add previous responses from Round 1
    if (this.responses.length > 0) {
      prompt += '=== IDEAS FROM ROUND 1 ===\n';
      this.responses.forEach(r => {
        prompt += `${r.modelId}:\n${r.content}\n\n---\n\n`;
      });
      prompt += '=== END ROUND 1 IDEAS ===\n\n';
    }

    prompt += `FORMAT YOUR RESPONSE:
1. List 2-3 ideas you're championing (can be adopted, combined, or evolved)
2. For each, explain WHY this is promising and WHAT makes it work
3. Be specific about any improvements or combinations

Remember: The best ideas often come from unexpected combinations. Don't just pick favorites - actively improve them.

At the end, state:
Stance: Cross-pollinating
Confidence: [0-100]% in the refined idea set`;

    return prompt;
  }

  buildIdeationRound3Deathmatch(topic, description, model) {
    let prompt = `IDEATION ROUND 3: DEATHMATCH CRITIQUE

Topic: "${topic}"
${description ? `Context: ${description}\n` : ''}

YOUR MISSION: Brutally critique EVERY idea on the table, including your own.

`;

    // Add all responses so far
    if (this.responses.length > 0) {
      prompt += '=== ALL IDEAS TO CRITIQUE ===\n';
      const round2Responses = this.responses.filter(r => r.round === 2);
      const responsesToShow = round2Responses.length > 0 ? round2Responses : this.responses;
      responsesToShow.forEach(r => {
        prompt += `${r.modelId}:\n${r.content}\n\n---\n\n`;
      });
      prompt += '=== END IDEAS ===\n\n';
    }

    prompt += `DEATHMATCH RULES:
1. Find FATAL FLAWS in every idea - the showstoppers that would kill it
2. Find MAJOR WEAKNESSES - significant problems that need solving
3. Find MINOR ISSUES - things that would need attention but aren't dealbreakers
4. Be BRUTAL but FAIR - back up every critique with reasoning
5. DO NOT SPARE YOUR OWN IDEAS - if they're weak, expose them

FORMAT:
For each major idea, provide:
IDEA: [Name]
- FATAL: [Any fatal flaws, or "None identified"]
- MAJOR: [List major weaknesses]
- MINOR: [List minor issues]

The goal is to STRESS-TEST every idea so only the strongest survive. Be the critic you'd want reviewing your own work.

At the end, state:
Stance: Critical analysis
Confidence: [0-100]% that I've identified the real problems`;

    return prompt;
  }

  buildIdeationRound4VoteDefend(topic, description, model) {
    let prompt = `IDEATION ROUND 4: VOTE + DEFEND

Topic: "${topic}"
${description ? `Context: ${description}\n` : ''}

Round 3 exposed the weaknesses. Now it's time to decide what survives.

`;

    // Add Round 3 critiques
    if (this.responses.length > 0) {
      prompt += '=== ROUND 3 CRITIQUES ===\n';
      const round3Responses = this.responses.filter(r => r.round === 3);
      if (round3Responses.length > 0) {
        round3Responses.forEach(r => {
          prompt += `${r.modelId} critiques:\n${r.content}\n\n---\n\n`;
        });
      }
      prompt += '=== END CRITIQUES ===\n\n';
    }

    prompt += `YOUR MISSION:
1. VOTE for your TOP 2 ideas (from any participant)
2. DEFEND those ideas against the critiques from Round 3

FORMAT YOUR RESPONSE:

VOTES:
1. [Idea Title] - [One sentence why]
2. [Idea Title] - [One sentence why]

DEFENSE OF VOTE #1:
[Address the critiques raised against this idea. Either:
- Explain why the critique is wrong/overstated
- Propose a modification that solves the problem
- Acknowledge the risk but explain why it's acceptable]

DEFENSE OF VOTE #2:
[Same format]

Be honest: If a critique is valid and you can't defend against it, that idea probably shouldn't be in your top 2.

At the end, state:
Stance: [Your top pick]
Confidence: [0-100]% in this selection`;

    return prompt;
  }

  buildIdeationRound5_6Refine(round, topic, description, model) {
    const roundLabel = round === 5 ? 'FIRST REFINEMENT' : 'FINAL REFINEMENT';

    let prompt = `IDEATION ROUND ${round}: ${roundLabel}

Topic: "${topic}"
${description ? `Context: ${description}\n` : ''}

The votes are in. Now we refine the top ideas.

`;

    // Add voting results from Round 4
    if (this.responses.length > 0) {
      prompt += '=== VOTING RESULTS FROM ROUND 4 ===\n';
      const round4Responses = this.responses.filter(r => r.round === 4);
      if (round4Responses.length > 0) {
        round4Responses.forEach(r => {
          prompt += `${r.modelId}:\n${r.content}\n\n---\n\n`;
        });
      }
      prompt += '=== END VOTES ===\n\n';
    }

    prompt += `YOUR MISSION: Make the leading idea(s) BULLETPROOF

Focus on:
1. ADDRESSING remaining critiques that weren't fully resolved
2. ADDING implementation details - how would this actually work?
3. STRENGTHENING the value proposition - why is this the best approach?
4. IDENTIFYING edge cases and how to handle them
5. CREATING a clear path from idea to execution

${round === 6 ? 'This is the FINAL refinement round. Polish these ideas to their best possible form.' : 'Focus on the structural improvements. Details will be polished in Round 6.'}

At the end, state:
Stance: Refining [idea name]
Confidence: [0-100]% this is ready for final evaluation`;

    return prompt;
  }

  buildIdeationRound7FinalShowdown(topic, description, model) {
    let prompt = `IDEATION ROUND 7: FINAL SHOWDOWN

Topic: "${topic}"
${description ? `Context: ${description}\n` : ''}

This is it. Time to pick the WINNER.

`;

    // Add refined ideas from Rounds 5-6
    if (this.responses.length > 0) {
      prompt += '=== REFINED IDEAS FROM ROUNDS 5-6 ===\n';
      const refinedResponses = this.responses.filter(r => r.round === 5 || r.round === 6);
      if (refinedResponses.length > 0) {
        refinedResponses.forEach(r => {
          prompt += `${r.modelId} (Round ${r.round}):\n${r.content}\n\n---\n\n`;
        });
      }
      prompt += '=== END REFINED IDEAS ===\n\n';
    }

    prompt += `YOUR MISSION: Declare a WINNER

EVALUATION CRITERIA:
1. FEASIBILITY: Can this actually be done?
2. IMPACT: How much value does this create?
3. RESILIENCE: Did it survive the critiques?
4. CLARITY: Is the path to execution clear?
5. DIFFERENTIATION: Does this offer something meaningfully better?

FORMAT YOUR RESPONSE:

WINNER: [Idea Title]

HEAD-TO-HEAD ANALYSIS:
[Compare the top 2 finalists on each criterion above]

WHY THIS WINS:
[2-3 sentences on the decisive factor(s)]

RUNNER-UP VALUE:
[What's worth preserving from the second-place idea?]

FINAL RECOMMENDATION:
[One paragraph executive summary of what to do and why]

At the end, state:
Stance: [Winner idea name]
Confidence: [0-100]% this is the right choice`;

    return prompt;
  }

  // ========== END IDEATION MODE PROMPTS ==========

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

  /**
   * Summarize a single model's full response for use in round synthesis
   * This extracts the key arguments without losing substance
   */
  async summarizeModelResponse(modelId, content, topic) {
    const prompt = `Summarize this model's argument in 200-300 words. Capture:
- Their position and confidence
- Key evidence, data, or logic cited
- Specific recommendations or concerns
- Any unique insights not likely shared by others

Topic: ${topic}

${modelId}'s full response:
${content}

Provide a dense, substantive summary. This feeds into a round synthesis for other models.`;

    if (this.anthropic) {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.3
      });
      return response.content[0].text;
    } else if (this.openai) {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.3
      });
      return response.choices[0].message.content;
    }

    // Fallback: just truncate
    return content.substring(0, 1000) + '...';
  }

  /**
   * Generate a comprehensive synthesis of a round's arguments using two-pass approach
   * Pass 1: Summarize each model's full response individually (parallel)
   * Pass 2: Combine summaries into a comprehensive round synthesis
   */
  async generateRoundSynthesis(roundNumber, roundResponses, topic) {
    if (!roundResponses || roundResponses.length === 0) {
      return 'No responses to synthesize.';
    }

    console.log(`[Round ${roundNumber}] Starting two-pass synthesis for ${roundResponses.length} responses...`);

    try {
      // PASS 1: Summarize each model's full response (in parallel)
      const summaryPromises = roundResponses.map(r =>
        this.summarizeModelResponse(r.modelId, r.content, topic)
          .then(summary => {
            console.log(`[Round ${roundNumber}] Summarized ${r.modelId}`);
            return { modelId: r.modelId, position: r.position, confidence: r.confidence, summary };
          })
          .catch(err => {
            console.error(`[Synthesis] Failed to summarize ${r.modelId}:`, err);
            // Fallback to truncation if summarization fails
            return {
              modelId: r.modelId,
              position: r.position,
              confidence: r.confidence,
              summary: r.content.substring(0, 1000) + '...'
            };
          })
      );

      const modelSummaries = await Promise.all(summaryPromises);
      console.log(`[Round ${roundNumber}] All ${modelSummaries.length} summaries complete, generating synthesis...`);

      // PASS 2: Combine summaries into round synthesis
      const summariesText = modelSummaries.map(s =>
        `**${s.modelId}** (${s.position}, ${s.confidence}% confident):\n${s.summary}`
      ).join('\n\n---\n\n');

      const synthesisPrompt = `Create a comprehensive Round ${roundNumber} synthesis.

Topic: ${topic}

Model Summaries:
${summariesText}

Your synthesis must include:

1. **POSITIONS**: How many favor each option, with confidence levels

2. **KEY ARGUMENTS BY MODEL**: 2-3 sentences per model on their core reasoning

3. **POINTS OF AGREEMENT**: Specific shared reasoning (not just "all agree")

4. **POINTS OF DISAGREEMENT**: Where models diverge, what concerns some raised

5. **OPEN QUESTIONS**: What wasn't addressed or remains uncertain

Target: 400-600 words. This is passed to ALL models in the next round.`;

      let synthesisText;

      if (this.anthropic) {
        const response = await this.anthropic.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          messages: [{ role: 'user', content: synthesisPrompt }],
          max_tokens: 1200,
          temperature: 0.3
        });
        synthesisText = response.content[0].text;
      } else if (this.openai) {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: synthesisPrompt }],
          max_tokens: 1200,
          temperature: 0.3
        });
        synthesisText = response.choices[0].message.content;
      } else {
        // Fallback: just concatenate summaries
        synthesisText = `Round ${roundNumber} Summary:\n${summariesText}`;
      }

      // Store for later use
      this.roundSyntheses[roundNumber] = synthesisText;
      return synthesisText;
    } catch (error) {
      console.error('[RoundSynthesis] Error:', error);
      return `Round ${roundNumber}: ${roundResponses.length} responses received.`;
    }
  }

  /**
   * Run the Challenger as a separate step after round synthesis
   * Returns the challenger's stress-test of the current debate state
   */
  async runChallengerStep(roundNumber, synthesis, topic, challengerModel) {
    if (!challengerModel) {
      return null;
    }

    // Build previous challenges context
    let previousChallenges = '';
    for (let r = 1; r < roundNumber; r++) {
      if (this.challengerResponses[r]) {
        previousChallenges += `Round ${r} Challenge: ${this.challengerResponses[r].substring(0, 200)}...\n`;
      }
    }

    const prompt = `You are the CHALLENGER. Your job is to FORGE STRONGER ANSWERS through rigorous stress-testing.

TOPIC: ${topic}

CURRENT STATE (Round ${roundNumber}):
${synthesis}

${previousChallenges ? `YOUR PREVIOUS CHALLENGES:\n${previousChallenges}\n` : ''}

REVIEW EACH PREVIOUS CHALLENGE (if any):
- If ADDRESSED WELL → Acknowledge: "The [solution] handles the [concern]. Good."
- If PARTIALLY ADDRESSED → Press for clarity: "You mentioned X but didn't specify Y."
- If IGNORED → Press harder: "Still no answer on [critical issue]."

NEW CHALLENGES MUST BE:
✅ REALISTIC - Could actually happen to real people
✅ MATERIAL - Would genuinely change the decision if true
✅ NOT ALREADY COVERED - Don't repeat addressed concerns

DO NOT:
❌ Manufacture absurd scenarios
❌ Challenge just to have something to challenge
❌ Repeat concerns that were adequately addressed
❌ Be contrarian for contrarian's sake

IF THE ARGUMENTS ARE SOLID, SAY SO:
"The core risks have been addressed:
- [Risk 1] handled by [Solution 1] ✓
- [Risk 2] handled by [Solution 2] ✓
Remaining edge cases are minor and shouldn't change the recommendation."

Your job is to make the answer IRON-FORGED, not to be difficult.
A Challenger who acknowledges solid arguments is MORE credible than one who manufactures fake concerns.

Keep your response to 200-300 words focused on the most important challenges.`;

    try {
      let challengerText;
      const modelId = challengerModel.modelId || challengerModel.id;
      const provider = challengerModel.provider;

      if (provider === 'anthropic' && this.anthropic) {
        const response = await this.anthropic.messages.create({
          model: modelId,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 500,
          temperature: 0.7
        });
        challengerText = response.content[0].text;
      } else if (provider === 'openai' && this.openai) {
        const response = await this.openai.chat.completions.create({
          model: modelId,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 500,
          temperature: 0.7
        });
        challengerText = response.choices[0].message.content;
      } else if (provider === 'google' && this.google) {
        const model = this.google.getGenerativeModel({ model: modelId });
        const result = await model.generateContent(prompt);
        challengerText = result.response.text();
      } else {
        // Use OpenAI as fallback
        if (this.openai) {
          const response = await this.openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 500,
            temperature: 0.7
          });
          challengerText = response.choices[0].message.content;
        } else {
          challengerText = 'Challenger unavailable - no API configured.';
        }
      }

      // Store for later use
      this.challengerResponses[roundNumber] = challengerText;
      return challengerText;
    } catch (error) {
      console.error('[ChallengerStep] Error:', error);
      return `Challenger error: ${error.message}`;
    }
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
          model: 'claude-sonnet-4-5-20250929',
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

      // === IRON-FORGED: Build confidence trajectory across all rounds ===
      const confidenceTrajectory = {};
      debate.debateRounds.forEach(round => {
        round.responses.forEach(r => {
          if (!r.modelId.startsWith('challenger-') && r.confidence > 0) {
            if (!confidenceTrajectory[r.modelId]) {
              confidenceTrajectory[r.modelId] = [];
            }
            confidenceTrajectory[r.modelId].push({
              round: round.roundNumber,
              confidence: r.confidence
            });
          }
        });
      });

      // Format confidence changes for the judge
      let confidenceAnalysis = '';
      const significantDrops = [];
      Object.entries(confidenceTrajectory).forEach(([modelId, trajectory]) => {
        if (trajectory.length >= 2) {
          const first = trajectory[0].confidence;
          const last = trajectory[trajectory.length - 1].confidence;
          const change = last - first;
          if (Math.abs(change) >= 10) {
            significantDrops.push({
              model: modelId,
              start: first,
              end: last,
              change: change
            });
          }
        }
      });

      if (significantDrops.length > 0) {
        confidenceAnalysis = '\n=== CONFIDENCE TRAJECTORY ===\n';
        significantDrops.forEach(d => {
          const direction = d.change < 0 ? 'dropped' : 'increased';
          confidenceAnalysis += `${d.model}: ${d.start}% → ${d.end}% (${direction} ${Math.abs(d.change)} points)\n`;
        });
        confidenceAnalysis += '\nNOTE: Confidence drops often indicate genuine deliberation - models grappling with valid challenges rather than blindly defending their initial position. This is the OPPOSITE of sycophantic AI behavior. Highlight significant confidence changes in your analysis.\n';
        confidenceAnalysis += '=== END TRAJECTORY ===\n\n';
      }

      // === IRON-FORGED: Build debate evolution context ===
      let evolutionContext = '';
      const totalRounds = debate.debateRounds.length;

      if (Object.keys(this.roundSyntheses).length > 0 || Object.keys(this.challengerResponses).length > 0) {
        evolutionContext = '\n=== DEBATE EVOLUTION ===\n';
        for (let r = 1; r <= totalRounds; r++) {
          if (this.roundSyntheses[r]) {
            evolutionContext += `Round ${r} Summary: ${this.roundSyntheses[r]}\n`;
          }
          if (this.challengerResponses[r]) {
            evolutionContext += `  → Challenger (Round ${r}): ${this.challengerResponses[r].substring(0, 300)}...\n`;
          }
        }
        evolutionContext += '=== END EVOLUTION ===\n\n';
        evolutionContext += 'IMPORTANT: Consider whether participants addressed the Challenger\'s concerns. Penalize those who ignored legitimate challenges. Reward those who adapted thoughtfully or provided good counter-arguments.\n\n';
      }

      const prompt = `As the judge, evaluate the QUALITY OF ARGUMENTS in this debate.

Topic: ${debate.topic}

${confidenceAnalysis}${evolutionContext}${failedCount > 0 ? `Note: ${failedCount} model(s) failed to respond. Analysis based on ${validResponses.length} successful participant(s).\n\n` : ''}Final Round ${analysisRound.roundNumber} Positions:
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
        normalizedJudgeModel = 'claude-sonnet-4-5-20250929';
      } else if (judgeModel === 'gpt-4o') {
        normalizedJudgeModel = 'gpt-4o';
      } else if (judgeModel && (judgeModel.includes('gpt-5') || judgeModel.includes('gpt-5.2'))) {
        // GPT-5 and GPT-5.2 models pass through as-is
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

        // GPT-5 Pro and GPT-5.2 Pro use Responses API
        if (normalizedJudgeModel === 'gpt-5-pro' || normalizedJudgeModel === 'gpt-5.2-pro') {
          console.log(`[Judge] Using Responses API for ${normalizedJudgeModel}`);
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
            model: 'claude-sonnet-4-5-20250929',
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
        // Strip markdown formatting (bold, italic) from winner name
        const winnerName = match[1].trim().replace(/\*+/g, '').trim();

        const participant = participants.find(p =>
          p.model.toLowerCase().includes(winnerName.toLowerCase()) ||
          winnerName.toLowerCase().includes(p.model.toLowerCase())
        );

        if (participant) {
          // Escape special regex characters in winner name to prevent regex errors
          const escapedWinnerName = winnerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          let reason = 'Best overall arguments and reasoning';
          try {
            const reasonMatch = analysisText.match(new RegExp(`${escapedWinnerName}[^.]*because([^.]+)`, 'i'));
            if (reasonMatch) reason = reasonMatch[1].trim();
          } catch (regexError) {
            console.warn('Regex failed for reason extraction:', regexError.message);
          }

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





