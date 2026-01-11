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
    this.rubric = null; // Generated evaluation rubric for ideation mode

    // State for iron-forged debates
    this.roundSyntheses = {};      // { roundNumber: "synthesis text" }
    this.challengerResponses = {}; // { roundNumber: "challenger text" }

    // State for ideation role assignment
    this.modelRoles = {};          // { modelId: "Optimist" | "Devil's Advocate" | etc }
    this.wildCardModels = [];      // Array of modelIds assigned wild card duty in round 3
    
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

  /**
   * Generate an evaluation rubric from user's success criteria
   * @param {string} successCriteria - User's goal for what makes a winning idea
   * @param {string} topic - The ideation topic
   * @returns {Promise<string>} - Generated rubric text
   */
  async generateRubric(successCriteria, topic) {
    if (!successCriteria || !this.anthropic) {
      return null;
    }

    const prompt = `Convert this success criteria into an evaluation rubric that measures whether ideas are GENUINELY COMPELLING - not just whether they have the right features.

SUCCESS CRITERIA: "${successCriteria}"
TOPIC: "${topic}"

IMPORTANT: Do NOT generate criteria about features, mechanics, or distribution.
Generate criteria about the EXPERIENCE and COMPULSION.

Think about what made Wordle, Among Us, or Flappy Bird impossible to put down.
It wasn't "viral mechanics" - it was genuine satisfaction, tension, mastery, and delight.

Generate exactly 5 criteria that measure:
- Is this genuinely FUN? (not "does it have features that could be fun")
- Would someone play this on day 30? (not "does it have retention mechanics")
- Is there a moment that creates emotion? (satisfaction, tension, surprise, delight)
- Would someone tell a story about this? (not "can they share a score")
- Is there skill/mastery/progression? (not "are there streaks")

FORMAT:
1. [CRITERION NAME] (0-10)
   [What makes this a 9 vs a 5? Focus on the FEELING, not the feature.]

2. [CRITERION NAME] (0-10)
   [What makes this a 9 vs a 5? Focus on the FEELING, not the feature.]

(continue for all 5)

The rubric should help filter out ideas that "technically have viral mechanics" but are actually boring.`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 600,
        temperature: 0.3
      });

      this.rubric = response.content[0].text;
      return this.rubric;
    } catch (error) {
      console.error('Error generating rubric:', error);
      return null;
    }
  }

  /**
   * Extracts hard requirements from the topic/description as a structured checklist.
   * This ensures models can't ignore buried requirements in prose.
   * @param {string} topic - The debate topic
   * @param {string} description - The full description with requirements
   * @returns {Promise<string>} - Extracted requirements as checklist
   */
  async extractRequirements(topic, description) {
    if (!description || !this.anthropic) {
      return null;
    }

    const prompt = `Extract the HARD REQUIREMENTS from this project brief. These are non-negotiable constraints that any solution MUST satisfy.

TOPIC: "${topic}"

FULL BRIEF:
${description}

Extract ALL hard requirements as a numbered checklist. Look for:
- Explicit constraints ("must", "needs to", "has to", "required")
- Target audience specifications
- Technical constraints (platform, timing, scale)
- Success metrics or goals
- Negative constraints ("must NOT", "avoid", "no")

FORMAT (output ONLY this, no preamble):
HARD REQUIREMENTS:
1. [Requirement in clear, actionable language]
2. [Requirement in clear, actionable language]
...

Be exhaustive. If a requirement is buried in the prose, extract it. If something is implied but critical, make it explicit.
Keep each requirement to one line. Aim for 5-10 requirements.`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.2
      });

      this.requirements = response.content[0].text;
      return this.requirements;
    } catch (error) {
      console.error('Error extracting requirements:', error);
      return null;
    }
  }

  /**
   * Assign randomized roles to models for ideation debates.
   * Each model gets a perspective they must maintain throughout the debate.
   * Also selects 1-2 models for "wild card" duty in round 3.
   */
  assignIdeationRoles() {
    const roles = ['Optimist', "Devil's Advocate", 'User Advocate', 'Feasibility Skeptic', 'Wild Card'];
    // Shuffle roles randomly
    const shuffled = [...roles].sort(() => Math.random() - 0.5);

    this.modelRoles = {};
    this.models.forEach((model, i) => {
      this.modelRoles[model.id] = shuffled[i % shuffled.length];
    });

    // Mark 1-2 models for wild card duty in round 3 (propose divergent ideas)
    const wildCardCount = Math.min(2, Math.ceil(this.models.length / 3));
    this.wildCardModels = this.models.slice(0, wildCardCount).map(m => m.id);

    console.log('[Ideation] Role assignments:', this.modelRoles);
    console.log('[Ideation] Wild card models:', this.wildCardModels);
  }

  /**
   * Get the role prompt injection for a specific model in ideation mode.
   * @param {string} modelId - The model's ID
   * @returns {string} - Role-specific prompt text to inject
   */
  getRolePrompt(modelId) {
    const role = this.modelRoles[modelId];
    if (!role) return '';

    const rolePrompts = {
      'Optimist': `
═══════════════════════════════════════════════════════════════
YOUR ROLE: OPTIMIST
Your job is to find the strongest version of each idea. What makes it work?
Look for hidden potential others might miss. Champion ideas that could succeed.
═══════════════════════════════════════════════════════════════`,
      "Devil's Advocate": `
═══════════════════════════════════════════════════════════════
YOUR ROLE: DEVIL'S ADVOCATE
Your job is to find the fatal flaw. Why will this fail in practice?
Be ruthless but fair. If an idea survives your critique, it's probably solid.
═══════════════════════════════════════════════════════════════`,
      'User Advocate': `
═══════════════════════════════════════════════════════════════
YOUR ROLE: USER ADVOCATE
Your job is to represent real users. Would they actually do this? What would they hate?
Think about the lazy path, the confused user, the edge cases that kill adoption.
═══════════════════════════════════════════════════════════════`,
      'Feasibility Skeptic': `
═══════════════════════════════════════════════════════════════
YOUR ROLE: FEASIBILITY SKEPTIC
Your job is to assess implementation complexity. What gets cut for v1?
Consider technical debt, maintenance burden, scaling challenges, and timeline.
═══════════════════════════════════════════════════════════════`,
      'Wild Card': `
═══════════════════════════════════════════════════════════════
YOUR ROLE: WILD CARD
Your job is to find the unconventional angle everyone is missing.
Challenge assumptions. Propose alternatives nobody else would consider.
═══════════════════════════════════════════════════════════════`
    };

    return rolePrompts[role] || '';
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
    console.log(`[buildPrompt] Round ${round}, debateStyle: ${debateStyle}, isConsensusMode: ${isConsensusMode}`);

    // Check if this model is the Challenger
    if (model?.isChallenger) {
      return this.buildChallengerPrompt(round, topic, description);
    }

    // Check for ideation mode
    if (debateStyle === 'ideation') {
      console.log(`[buildPrompt] Using IDEATION mode for round ${round}`);
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

  // ========== IDEATION MODE ==========

  buildIdeationPrompt(round, topic, description, model) {
    // Route to round-specific ideation prompt (5 rounds total)
    // R1: Diverge → R2: Stress Test → R3: Defend + Mutate → R4: Vote + Justify → R5: Final Verdict
    switch (round) {
      case 1:
        return this.buildIdeationRound1Diverge(topic, description, model);
      case 2:
        return this.buildIdeationRound2StressTest(topic, description, model);
      case 3:
        return this.buildIdeationRound3DefendMutate(topic, description, model);
      case 4:
        return this.buildIdeationRound4VoteJustify(topic, description, model);
      case 5:
        return this.buildIdeationRound5FinalVerdict(topic, description, model);
      default:
        // Fallback for unexpected rounds
        return this.buildIdeationRound5FinalVerdict(topic, description, model);
    }
  }

  // Keep old method name as alias for backwards compatibility
  buildIdeationRound1Generate(topic, description, model) {
    return this.buildIdeationRound1Diverge(topic, description, model);
  }

  buildIdeationRound1Diverge(topic, description, model) {
    const ideaCount = this.config.ideaCount || 4;

    // Get role prompt for this model
    const rolePrompt = this.getRolePrompt(model.id);

    // Build requirements section
    const requirementsSection = this.requirements ? `
HARD REQUIREMENTS (from brief):
${this.requirements}
` : '';

    // Build rubric section
    const rubricSection = this.rubric ? `
EVALUATION CRITERIA (score each 1-10):
${this.rubric}
` : '';

    let prompt = `IDEATION ROUND 1: GENERATE IDEAS
${rolePrompt}
════════════════════════════════════════════════════════════════
BRIEF:
Topic: "${topic}"
${description ? `Context: ${description}` : ''}
════════════════════════════════════════════════════════════════
${requirementsSection}${rubricSection}
════════════════════════════════════════════════════════════════
STEP 1: ANALYZE THE BRIEF (do this first)
════════════════════════════════════════════════════════════════

Before generating ideas, answer these questions:

BRIEF ANALYSIS:
1. CORE ASK: [One sentence - what does the brief actually want?]
2. VIRAL REQUIRED: [YES/NO - does brief mention viral spread, network effects, "me + 1", or similar?]
3. TARGET USER: [Who is this for? Be specific.]
4. SUCCESS LOOKS LIKE: [What outcome makes this a win?]

════════════════════════════════════════════════════════════════
STEP 2: UNDERSTAND THE GATES (ideas must pass ALL relevant gates)
════════════════════════════════════════════════════════════════

For EACH idea, you must pass these gates IN ORDER. If any gate fails, KILL the idea.

GATE 1 - REQUIREMENTS CHECK (if requirements exist):
- Does idea satisfy ALL hard requirements? [YES = PASS / NO = KILL]

GATE 2 - OTHERS REQUIRED (if VIRAL REQUIRED = YES):
- Can this be used alone? [YES = KILL / NO = PASS]
- "Solo + share results" = KILL (that's not requiring others)
- "Leaderboards" = KILL (passive comparison isn't involvement)

GATE 3 - VIRAL CHAIN (if VIRAL REQUIRED = YES):
- After A engages with B, is B compelled to bring in C? [YES = PASS / NO = KILL]
- "Share a link" isn't compulsion. What FORCES B to recruit C?

GATE 4 - COMPELLING (always required):
- Would someone engage with this on day 30? [YES = PASS / NO = KILL]
- Is there a specific "one more" moment you can describe vividly? [YES = PASS / NO = KILL]

GATE 5 - QUALITY SCORES (if rubric exists):
- Score each criterion 1-10. If ANY score < 7, KILL the idea.

════════════════════════════════════════════════════════════════
STEP 3: GENERATE AND FILTER
════════════════════════════════════════════════════════════════

Think of 15-20 ideas internally. Run each through the gates. Most will die.
Submit ONLY the ${ideaCount} (maximum) that pass ALL gates.

${ideaCount} is the MAX, not a quota. If only 2 pass, submit 2.

════════════════════════════════════════════════════════════════
STEP 4: FORMAT FOR EACH SURVIVING IDEA
════════════════════════════════════════════════════════════════

IDEA [N]:

TITLE: [Memorable name]

WHAT IT IS: [2-3 sentences - how does it work?]

GATE RESULTS:
- G1 Requirements: [PASS/N/A] - [brief reason]
- G2 Others Required: [PASS/N/A] - [how exactly do 2+ people interact?]
- G3 Viral Chain: [PASS/N/A] - [A does X with B → B brings C because ___]
- G4 Compelling: [PASS] - [describe the "one more" moment vividly in 2 sentences]
- G5 Scores: [PASS/N/A] - [list scores: criterion1: X, criterion2: Y, ...]

THE HOOK: [The specific moment/feeling that makes this irresistible. Be vivid.]

DAY 30: [Why someone still engages on day 30, not just day 1]

════════════════════════════════════════════════════════════════

OUTPUT FORMAT:

1. First, show your BRIEF ANALYSIS
2. Then, for each surviving idea, show the full format above
3. End with: CONVICTION: [LOW/MEDIUM/HIGH] - [one sentence why these survive scrutiny]

Only submit ideas that passed ALL relevant gates. No exceptions.`;

    return prompt;
  }

  buildIdeationRound2CrossPollinate(topic, description, model) {
    // Get Round 1 responses to show all ideas
    const round1Responses = this.responses.filter(r => r.round === 1);
    const ideasDisplay = round1Responses.length > 0
      ? round1Responses.map(r => `=== ${r.modelId} ===\n${r.content}`).join('\n\n---\n\n')
      : 'No ideas from Round 1 yet.';

    let prompt = `IDEATION ROUND 2: CROSS-POLLINATE

═══════════════════════════════════════════════════════════════
REQUIREMENT:
Topic: "${topic}"
${description ? `Context: ${description}` : '(No additional context provided)'}
═══════════════════════════════════════════════════════════════

YOUR MISSION: Build on the collective creativity. You may:
- ADOPT: Take an idea you like from another participant and champion it
- COMBINE: Merge two or more ideas into something stronger
- IMPROVE: Take any idea and make it better with specific enhancements
- EVOLVE: Use an idea as inspiration for something new

═══════════════════════════════════════════════════════════════
ALL IDEAS FROM ROUND 1:
═══════════════════════════════════════════════════════════════
${ideasDisplay}
═══════════════════════════════════════════════════════════════

YOUR RESPONSE FORMAT:
Pick 2-3 ideas you want to champion. For each:

CHAMPIONING: "[Idea Title]"
ACTION: [ADOPT / COMBINE / IMPROVE / EVOLVE]
{IF COMBINE: Combining with "[Other Idea]"}
CHANGES: [What you're adding/changing/combining]
IMPROVED VERSION: [Full description of the improved idea]

The best ideas often come from unexpected combinations.

At the end, state:
Stance: Cross-pollinating
Confidence: [0-100]% in the refined idea set`;

    return prompt;
  }

  buildIdeationRound3StressTest(topic, description, model) {
    // Get Round 1 and Round 2 responses for context
    const round1Responses = this.responses.filter(r => r.round === 1);
    const round2Responses = this.responses.filter(r => r.round === 2);

    // Show Round 2 evolved ideas (or R1 if R2 is empty)
    const ideasToShow = round2Responses.length > 0 ? round2Responses : round1Responses;
    const ideasDisplay = ideasToShow.length > 0
      ? ideasToShow.map(r => `=== ${r.modelId} ===\n${r.content}`).join('\n\n---\n\n')
      : 'No ideas to stress test yet.';

    // Build rubric grading section if available
    const rubricSection = this.rubric ? `
═══════════════════════════════════════════════════════════════
GRADE EACH IDEA AGAINST THIS RUBRIC:
═══════════════════════════════════════════════════════════════
${this.rubric}
═══════════════════════════════════════════════════════════════
For each idea, provide scores (0-10) for each criterion above.
` : '';

    let prompt = `IDEATION ROUND 3: STRESS TEST

═══════════════════════════════════════════════════════════════
REQUIREMENT:
Topic: "${topic}"
${description ? `Context: ${description}` : '(No additional context provided)'}
═══════════════════════════════════════════════════════════════
${rubricSection}
YOUR JOB: Find the REAL flaws that would make these ideas fail in practice.

The goal is to make ideas STRONGER by finding problems NOW, not to be clever about finding unlikely failure modes. We want ideas that work in the real world, not ideas that only fail during an EMP or zombie apocalypse.

═══════════════════════════════════════════════════════════════
IDEAS TO STRESS TEST:
═══════════════════════════════════════════════════════════════
${ideasDisplay}
═══════════════════════════════════════════════════════════════

FIND REAL PROBLEMS - Ask these questions for EVERY idea:

1. THE "ACTUALLY DO IT" TEST
   - Walk through someone ACTUALLY implementing this step by step
   - What's the FIRST practical obstacle they hit?
   - What obvious thing did the proposer forget to mention?

2. THE "HUMAN NATURE" TEST
   - Will people ACTUALLY do this consistently? Or just the first time?
   - What's the lazy/easy path that undermines the idea?
   - What happens when someone is tired, busy, or doesn't care?

3. THE "ALREADY EXISTS" TEST
   - Does something similar already exist? Why or why not?
   - If it exists, why is this better? If it doesn't, what's the real barrier?

4. THE "SIMPLER ALTERNATIVE" TEST
   - Is there an obviously simpler way to achieve the same goal?
   - What's the 80/20 version that gets most of the benefit?

5. THE "WHAT BREAKS" TEST
   - What happens at month 2? Month 6? Year 2?
   - Where does this fail when the initial enthusiasm fades?

⚠️ RULES FOR VALID CRITIQUES:
- Critiques must be REALISTIC and LIKELY, not theoretical edge cases
- "What if there's a power outage" = INVALID (unless power is central to the idea)
- "What if everyone stops caring after 2 weeks" = VALID (this actually happens)
- "What if the economy crashes" = INVALID (too generic)
- "What if the key person quits" = VALID (this actually happens)
- Be SPECIFIC - "this won't work" is useless, "this won't work because X" is useful

FORMAT:
For each idea:

**[IDEA NAME]**: [FATAL FLAW / FIXABLE / SOLID]

MAIN PROBLEMS (real issues that would actually happen):
- [Specific problem #1]
- [Specific problem #2]

IF FIXABLE, HOW:
- [What would need to change to address the problems?]

---

The goal is CONSTRUCTIVE destruction. We want to either:
1. Kill bad ideas with real reasons (so we don't waste time)
2. Identify fixable problems (so we can fix them)
3. Confirm solid ideas (by failing to find real problems)

At the end, state:
FATAL FLAW (kill these): [List ideas with unfixable real-world problems]
FIXABLE (worth improving): [List ideas with problems that can be solved]
SOLID (survived stress test): [List ideas you couldn't find real problems with]

CONVICTION: [LOW/MEDIUM/HIGH] because [one sentence reason]`;

    return prompt;
  }

  // New Round 2: Stress Test (now happens immediately after Diverge)
  buildIdeationRound2StressTest(topic, description, model) {
    const rolePrompt = this.getRolePrompt(model.id);

    // Get Round 1 responses - we stress test immediately after diverge
    const round1Responses = this.responses.filter(r => r.round === 1);
    const ideasDisplay = round1Responses.length > 0
      ? round1Responses.map(r => `=== ${r.modelId} ===\n${r.content}`).join('\n\n---\n\n')
      : 'No ideas to stress test yet.';

    const rubricSection = this.rubric ? `
EVALUATION CRITERIA (score each 1-10):
${this.rubric}
` : '';

    let prompt = `IDEATION ROUND 2: STRESS TEST
${rolePrompt}
════════════════════════════════════════════════════════════════
BRIEF:
Topic: "${topic}"
${description ? `Context: ${description}` : ''}
════════════════════════════════════════════════════════════════
${rubricSection}
════════════════════════════════════════════════════════════════
IDEAS TO EVALUATE:
════════════════════════════════════════════════════════════════
${ideasDisplay}
════════════════════════════════════════════════════════════════
STEP 1: UNDERSTAND YOUR JOB
════════════════════════════════════════════════════════════════

You are a harsh judge. Your job is to KILL bad ideas before they waste everyone's time.
Run each idea through the gates below. If ANY gate fails → KILL the idea.

Most ideas should die here. That's the point.

════════════════════════════════════════════════════════════════
STEP 2: THE GATES (run for EACH idea, in order)
════════════════════════════════════════════════════════════════

GATE 1 - GUT CHECK (always required):
- Imagine using this on day 30. Are you actually excited? [YES = PASS / NO = KILL]
- Can you describe the specific "one more" moment vividly? [YES = PASS / NO = KILL]
- If you're hedging ("it could be fun if...") → KILL

GATE 2 - OTHERS REQUIRED (check if brief mentions viral spread, network effects, or "me + 1"):
- First: Does brief require viral/network spread? [YES = apply gate / NO = skip]
- Can this be used ALONE? [YES = KILL / NO = PASS]
- "Solo + share results" = KILL (that's not requiring others)
- "Leaderboards" = KILL (passive comparison isn't involvement)

GATE 3 - VIRAL CHAIN (only if GATE 2 applies):
- After A engages with B, is B COMPELLED to bring in C? [YES = PASS / NO = KILL]
- "Share a link" isn't compulsion. What FORCES B to recruit C?
- If you can't explain the compulsion specifically → KILL

GATE 4 - QUALITY SCORES (if rubric exists):
- Score each criterion 1-10
- If ANY score < 7 → KILL
- No rounding up. No benefit of the doubt.

GATE 5 - REALITY CHECK:
- What's the lazy path users will actually take? Does idea survive it? [YES = PASS / NO = KILL]
- Does something similar exist? Is this genuinely better? [YES = PASS / NO = KILL]

════════════════════════════════════════════════════════════════
STEP 3: FORMAT FOR EACH IDEA
════════════════════════════════════════════════════════════════

**[IDEA NAME]**: [KILL / FIXABLE / SOLID]

GATE RESULTS:
- G1 Gut Check: [PASS/KILL] - [2 sentences: the "one more" moment OR why it's boring]
- G2 Others Required: [PASS/KILL/N/A] - [How exactly does it REQUIRE others? Or why it doesn't]
- G3 Viral Chain: [PASS/KILL/N/A] - [A does X with B → B brings C because ___ OR why chain breaks]
- G4 Scores: [PASS/KILL/N/A] - [criterion1: X, criterion2: Y, ... | lowest score determines pass/kill]
- G5 Reality: [PASS/KILL] - [lazy path + competition check]

VERDICT: [KILL / FIXABLE / SOLID]
- KILL = failed any gate, not worth saving
- FIXABLE = passed gates but has specific problems that can be fixed
- SOLID = passed all gates, no major issues

IF FIXABLE: [Specific changes needed - be concrete]

---

════════════════════════════════════════════════════════════════
STEP 4: FINAL SUMMARY
════════════════════════════════════════════════════════════════

After evaluating ALL ideas:

KILL LIST: [Ideas that failed gates - list which gate killed each]
FIXABLE LIST: [Ideas that passed but need specific fixes]
SURVIVORS: [Ideas that passed all gates cleanly]

CONVICTION: [LOW/MEDIUM/HIGH] - [one sentence: are any of these actually great, or just "okay"?]

════════════════════════════════════════════════════════════════
REMEMBER: You are not here to be nice. You are here to kill bad ideas.
If everything passes, you're not being harsh enough.
════════════════════════════════════════════════════════════════`;

    return prompt;
  }

  // New Round 3: Defend + Mutate (combines defense with wild card divergence)
  buildIdeationRound3DefendMutate(topic, description, model) {
    const rolePrompt = this.getRolePrompt(model.id);
    const isWildCardModel = this.wildCardModels.includes(model.id);

    // Get Round 2 stress test responses
    const round2Responses = this.responses.filter(r => r.round === 2);
    const stressTestDisplay = round2Responses.length > 0
      ? round2Responses.map(r => `=== ${r.modelId} ===\n${r.content}`).join('\n\n---\n\n')
      : 'No stress test results yet.';

    // Wild card section - only for designated models
    const wildCardSection = isWildCardModel ? `
═══════════════════════════════════════════════════════════════
⚡ WILD CARD REQUIREMENT (YOU ARE DESIGNATED) ⚡
═══════════════════════════════════════════════════════════════
In addition to defending/improving existing ideas, you MUST propose:
ONE COMPLETELY DIFFERENT APPROACH that nobody has mentioned yet.

This should NOT be a variation of existing ideas. It should be:
- A fundamentally different angle on the problem
- Something that challenges assumptions made so far
- An unconventional solution that could work

Format:
WILD CARD IDEA:
TITLE: [Something genuinely different]
DESCRIPTION: [How this differs from all ideas discussed]
WHY CONSIDER IT: [What makes this worth exploring]
═══════════════════════════════════════════════════════════════
` : '';

    let prompt = `IDEATION ROUND 3: DEFEND + MUTATE
${rolePrompt}
═══════════════════════════════════════════════════════════════
REQUIREMENT:
Topic: "${topic}"
${description ? `Context: ${description}` : '(No additional context provided)'}
═══════════════════════════════════════════════════════════════
${wildCardSection}
THE STRESS TEST RESULTS:
═══════════════════════════════════════════════════════════════
${stressTestDisplay}
═══════════════════════════════════════════════════════════════

YOUR MISSION: Respond to the critiques. For ideas you believe in:

1. ACKNOWLEDGE valid critiques (don't be defensive about real problems)
2. DEFEND against unfair critiques with specific counterarguments
3. MUTATE ideas to address fixable problems (propose specific changes)
4. KILL ideas that truly have fatal flaws (be honest, not sentimental)

FORMAT:

**DEFENDING [IDEA NAME]:**
- VALID CRITIQUES I ACCEPT: [List any real problems you agree with]
- UNFAIR CRITIQUES I REJECT: [Explain why specific critiques are wrong]
- MUTATIONS TO ADDRESS ISSUES: [Specific changes to make the idea stronger]
- NEW SCORE: [If you've improved it, re-grade against rubric]

**KILLING [IDEA NAME]:**
- WHY IT'S UNFIXABLE: [Be specific about the fatal flaw]

---

Focus on the top 3-5 ideas that have the best chance of surviving.
Drop ideas that are clearly inferior or redundant.

At the end, list:
SURVIVORS (still viable): [Ideas that survived stress test and improvements]
KILLED (confirmed dead): [Ideas with unfixable problems]

CONVICTION: [LOW/MEDIUM/HIGH] because [one sentence reason]`;

    return prompt;
  }

  buildIdeationRound4Rework(topic, description, model) {
    // Get Round 3 stress test responses
    const round3Responses = this.responses.filter(r => r.round === 3);
    const stressTestDisplay = round3Responses.length > 0
      ? round3Responses.map(r => `=== ${r.modelId} ===\n${r.content}`).join('\n\n---\n\n')
      : 'No stress test results yet.';

    let prompt = `IDEATION ROUND 4: REWORK

═══════════════════════════════════════════════════════════════
REQUIREMENT:
Topic: "${topic}"
${description ? `Context: ${description}` : '(No additional context provided)'}
═══════════════════════════════════════════════════════════════

Round 3 stress test is complete. Review the critiques below and respond.

═══════════════════════════════════════════════════════════════
STRESS TEST RESULTS FROM ROUND 3:
═══════════════════════════════════════════════════════════════
${stressTestDisplay}
═══════════════════════════════════════════════════════════════

YOUR MISSION: Respond to the stress test. You have THREE options:

OPTION A: FIX IT
If your idea got "FIXABLE" feedback, address the specific problems:
- State the problem that was identified
- Explain exactly how you're fixing it
- Show the improved version of the idea

OPTION B: KILL IT AND PIVOT
If your idea got "FATAL FLAW" feedback and you agree:
- Acknowledge what killed it
- Propose a NEW idea that avoids that fatal flaw
- Explain why the new idea won't die the same way

OPTION C: DEFEND IT
If you think the stress test was wrong:
- Quote the specific critique you're disputing
- Explain why it's not actually a real problem
- Provide evidence or reasoning to support your defense

═══════════════════════════════════════════════════════════════
FORMAT YOUR RESPONSE:

CHOSEN OPTION: [A: Fix / B: Pivot / C: Defend]

[If A - FIX:]
PROBLEM ADDRESSED: [Quote the specific problem from Round 3]
THE FIX: [Explain exactly what changes]
IMPROVED IDEA: [Full description of the fixed idea]

[If B - PIVOT:]
WHAT KILLED IT: [Quote the fatal flaw]
NEW IDEA: [Title]: [Full description]
WHY THIS WON'T DIE THE SAME WAY: [Explain]

[If C - DEFEND:]
DISPUTED CRITIQUE: [Quote it]
WHY IT'S WRONG: [Your defense with reasoning]
THE IDEA STANDS AS: [Restate the idea]
═══════════════════════════════════════════════════════════════

REMEMBER:
- You MUST pick one of the three options
- If you're fixing, be SPECIFIC about what changes
- If you're pivoting, the new idea must still solve the ORIGINAL REQUIREMENT above
- If you're defending, you need actual reasoning, not just "I disagree"

At the end, state:
FINAL IDEA: [Name of the idea you're putting forward]
Confidence: [0-100]% this idea can survive another stress test`;

    return prompt;
  }

  // New Round 4: Vote + Justify
  buildIdeationRound4VoteJustify(topic, description, model) {
    const rolePrompt = this.getRolePrompt(model.id);

    // Get Round 3 defend/mutate responses (the refined ideas)
    const round3Responses = this.responses.filter(r => r.round === 3);
    const defendedIdeasDisplay = round3Responses.length > 0
      ? round3Responses.map(r => `=== ${r.modelId} ===\n${r.content}`).join('\n\n---\n\n')
      : 'No defended ideas yet.';

    // Build rubric voting guidance if available
    const rubricVotingGuidance = this.rubric ? `
═══════════════════════════════════════════════════════════════
VOTE BASED ON THIS RUBRIC:
═══════════════════════════════════════════════════════════════
${this.rubric}
═══════════════════════════════════════════════════════════════
Vote for ideas that score HIGHEST on these criteria.
` : '';

    let prompt = `IDEATION ROUND 4: VOTE + JUSTIFY
${rolePrompt}
═══════════════════════════════════════════════════════════════
REQUIREMENT:
Topic: "${topic}"
${description ? `Context: ${description}` : '(No additional context provided)'}
═══════════════════════════════════════════════════════════════
${rubricVotingGuidance}
Ideas have been stress-tested, defended, and mutated. Now we vote on the survivors.

═══════════════════════════════════════════════════════════════
DEFENDED IDEAS FROM ROUND 3:
═══════════════════════════════════════════════════════════════
${defendedIdeasDisplay}
═══════════════════════════════════════════════════════════════

YOUR MISSION: Vote for the TOP 2 ideas that best solve the requirement.

VOTING CRITERIA:
1. Does it actually solve the stated requirement?
2. Did it survive the stress test (or successfully address the problems)?
3. Is it practical and implementable?
4. Is it better than the simpler alternatives?

═══════════════════════════════════════════════════════════════
FORMAT YOUR RESPONSE:

VOTE #1 (BEST):
Idea: [Exact name of the idea]
Why: [2-3 sentences on why this is the best solution to the requirement]

VOTE #2 (RUNNER-UP):
Idea: [Exact name of the idea]
Why: [2-3 sentences on why this is second best]

IDEAS I REJECTED AND WHY:
- [Idea name]: [One sentence on why it didn't make top 2]
- [Idea name]: [One sentence on why it didn't make top 2]
═══════════════════════════════════════════════════════════════

IMPORTANT:
- You CAN vote for your own idea if you genuinely think it's best
- You MUST vote for 2 different ideas
- Base votes on how well they solve the REQUIREMENT, not how creative they are

CONVICTION: [LOW/MEDIUM/HIGH] because [one sentence reason]`;

    return prompt;
  }

  // Keep old method for backwards compatibility
  buildIdeationRound5Vote(topic, description, model) {
    return this.buildIdeationRound4VoteJustify(topic, description, model);
  }

  buildIdeationRound6_7Refine(round, topic, description, model) {
    const roundLabel = round === 6 ? 'FIRST REFINEMENT' : 'FINAL REFINEMENT';

    // Get Round 5 votes to show what was voted on
    const round5Responses = this.responses.filter(r => r.round === 5);
    const votesDisplay = round5Responses.length > 0
      ? round5Responses.map(r => `=== ${r.modelId} ===\n${r.content}`).join('\n\n---\n\n')
      : 'No voting results yet.';

    let prompt = `IDEATION ROUND ${round}: ${roundLabel}

═══════════════════════════════════════════════════════════════
REQUIREMENT REMINDER - What we're solving for:
Topic: "${topic}"
${description ? `Context: ${description}` : '(No additional context provided)'}
═══════════════════════════════════════════════════════════════

The votes are in. Now we make the winning idea PERFECT.

═══════════════════════════════════════════════════════════════
VOTING RESULTS FROM ROUND 5:
═══════════════════════════════════════════════════════════════
${votesDisplay}
═══════════════════════════════════════════════════════════════

`;

    // For Round 7, also show Round 6 refinements
    if (round === 7 && this.responses.length > 0) {
      prompt += '=== ROUND 6 REFINEMENTS ===\n';
      const round6Responses = this.responses.filter(r => r.round === 6);
      if (round6Responses.length > 0) {
        round6Responses.forEach(r => {
          prompt += `${r.modelId}:\n${r.content}\n\n---\n\n`;
        });
      }
      prompt += '=== END ROUND 6 ===\n\n';
    }

    prompt += `YOUR MISSION: Take the #1 voted idea and make it BULLETPROOF.

${round === 6 ? `ROUND 6 FOCUS - Structure & Feasibility:
1. HOW does this actually get implemented? Step by step.
2. WHAT resources/tools/people are needed?
3. WHAT could still go wrong? How do we prevent it?
4. WHAT's the simplest version that still works? (MVP)
5. WHY is this better than the alternatives that were rejected?` :

`ROUND 7 FOCUS - Polish & Completeness:
1. REVIEW Round 6 refinements - what's still missing?
2. EDGE CASES - what weird scenarios need handling?
3. CONTINGENCY - what's the backup plan if X fails?
4. PRESENTATION - how do we explain this in one paragraph?
5. FINAL CHECK - does this ACTUALLY solve the original requirement?`}

═══════════════════════════════════════════════════════════════
FORMAT YOUR RESPONSE:

IDEA BEING REFINED: [Name of the top-voted idea]

${round === 6 ? `IMPLEMENTATION PLAN:
[Step-by-step how this gets done]

RESOURCES NEEDED:
[What's required to make this happen]

REMAINING RISKS AND MITIGATIONS:
[What could go wrong + how to prevent it]

MVP VERSION:
[Simplest version that still delivers value]` :

`GAPS ADDRESSED FROM ROUND 6:
[What was missing that you're adding]

EDGE CASES HANDLED:
[Weird scenarios and how to deal with them]

BACKUP PLAN:
[What if the main approach fails]

ONE-PARAGRAPH PITCH:
[Explain this idea to someone in 4-5 sentences]`}

═══════════════════════════════════════════════════════════════

At the end, state:
IDEA: [Name]
STATUS: [Ready for final showdown / Needs more work because X]
CONVICTION: [LOW/MEDIUM/HIGH] because [one sentence reason]`;

    return prompt;
  }

  // New Round 5: Final Verdict
  buildIdeationRound5FinalVerdict(topic, description, model) {
    const rolePrompt = this.getRolePrompt(model.id);

    // Get Round 4 voting responses
    const round4Responses = this.responses.filter(r => r.round === 4);
    const votesDisplay = round4Responses.length > 0
      ? round4Responses.map(r => `=== ${r.modelId} ===\n${r.content}`).join('\n\n---\n\n')
      : 'No voting results yet.';

    let prompt = `IDEATION ROUND 5: FINAL VERDICT
${rolePrompt}
═══════════════════════════════════════════════════════════════
REQUIREMENT REMINDER - What we're solving for:
Topic: "${topic}"
${description ? `Context: ${description}` : '(No additional context provided)'}
═══════════════════════════════════════════════════════════════

This is it. 5 rounds of ideation come down to this moment.
Pick the WINNER.

═══════════════════════════════════════════════════════════════
VOTING RESULTS FROM ROUND 4:
═══════════════════════════════════════════════════════════════
${votesDisplay}
═══════════════════════════════════════════════════════════════

THE JOURNEY SO FAR:
- Round 1 (Diverge): Ideas were generated with role-based perspectives
- Round 2 (Stress Test): Ideas were brutally tested for real flaws
- Round 3 (Defend + Mutate): Ideas were defended and improved; wild cards proposed
- Round 4 (Vote): We voted on the survivors

NOW: Pick the final winner.

═══════════════════════════════════════════════════════════════
EVALUATION CRITERIA:

1. SOLVES THE REQUIREMENT - Does this actually address what was asked?
2. SURVIVED THE GAUNTLET - Did it survive stress-testing and get stronger?
3. IMPLEMENTABLE - Is there a clear, realistic path to making this happen?
4. BETTER THAN ALTERNATIVES - Is this genuinely better than rejected options?

═══════════════════════════════════════════════════════════════
FORMAT YOUR RESPONSE:

WINNER: [Exact idea name]

SOLVES THE REQUIREMENT BECAUSE:
[2-3 sentences connecting the idea back to the original topic]

SURVIVED BECAUSE:
[What critiques did it face? How did it overcome them?]

IMPLEMENTATION PATH:
[High-level steps to make this real]

RUNNER-UP:
[What was second place? What value does it still have?]

FINAL VERDICT:
[One paragraph: "For [topic], the answer is [idea] because [reasons].
The key to success is [critical factor]. Avoid [main pitfall]."]

WINNER: [Repeat the winner name]
CONVICTION: [LOW/MEDIUM/HIGH] because [one sentence reason]`;

    return prompt;
  }

  // Keep old method for backwards compatibility
  buildIdeationRound8FinalShowdown(topic, description, model) {
    // Get refined ideas from Rounds 6-7
    const round6Responses = this.responses.filter(r => r.round === 6);
    const round7Responses = this.responses.filter(r => r.round === 7);

    const refinementsDisplay = [...round6Responses, ...round7Responses].length > 0
      ? [...round6Responses, ...round7Responses]
          .map(r => `=== ${r.modelId} (Round ${r.round}) ===\n${r.content}`)
          .join('\n\n---\n\n')
      : 'No refinements from Rounds 6-7 yet.';

    let prompt = `IDEATION ROUND 8: FINAL SHOWDOWN

═══════════════════════════════════════════════════════════════
REQUIREMENT REMINDER - What we're solving for:
Topic: "${topic}"
${description ? `Context: ${description}` : '(No additional context provided)'}
═══════════════════════════════════════════════════════════════

This is it. 8 rounds of ideation come down to this moment.
Pick the WINNER.

═══════════════════════════════════════════════════════════════
REFINED IDEAS FROM ROUNDS 6-7:
═══════════════════════════════════════════════════════════════
${refinementsDisplay}
═══════════════════════════════════════════════════════════════

YOUR MISSION: Declare the WINNER that best solves the original requirement.

THE JOURNEY SO FAR:
- Round 1: Ideas were generated (with pre-attack defense)
- Round 2: Ideas were combined and improved
- Round 3: Ideas were stress-tested for real flaws
- Round 4: Ideas were reworked based on feedback
- Round 5: We voted on the survivors
- Rounds 6-7: The winner was refined and polished

NOW: Pick the final winner.

═══════════════════════════════════════════════════════════════
EVALUATION CRITERIA:

1. SOLVES THE REQUIREMENT
   Does this actually address what was asked in the original topic?

2. SURVIVED THE GAUNTLET
   Did this idea survive stress-testing and get stronger from it?

3. IMPLEMENTABLE
   Is there a clear, realistic path to making this happen?

4. BETTER THAN ALTERNATIVES
   Is this genuinely better than the simpler options that were rejected?

═══════════════════════════════════════════════════════════════
FORMAT YOUR RESPONSE:

WINNER: [Exact idea name]

SOLVES THE REQUIREMENT BECAUSE:
[2-3 sentences connecting the idea back to the original topic]

SURVIVED BECAUSE:
[What critiques did it face? How did it overcome them?]

IMPLEMENTATION PATH:
[High-level steps to make this real]

RUNNER-UP:
[What was second place? What value does it still have?]

FINAL VERDICT:
[One paragraph: "For [topic], the answer is [idea] because [reasons].
The key to success is [critical factor]. Avoid [main pitfall]."]

═══════════════════════════════════════════════════════════════

At the end, state:
WINNER: [Idea name]
Confidence: [0-100]% this is the right solution to the original requirement`;

    return prompt;
  }

  // ========== END IDEATION MODE PROMPTS ==========

  analyzeResponse(content) {
    // Ensure content is a string
    const contentStr = typeof content === 'string' ? content : String(content || '');
    const lowerContent = contentStr.toLowerCase();

    // Extract explicit conviction statement (new ideation format)
    const convictionMatch = contentStr.match(/CONVICTION:\s*(LOW|MEDIUM|HIGH)/i);
    const conviction = convictionMatch ? convictionMatch[1].toUpperCase() : 'MEDIUM';

    // Map conviction to numeric confidence for backwards compatibility
    const confidenceMap = { 'LOW': 40, 'MEDIUM': 65, 'HIGH': 90 };
    let confidence = confidenceMap[conviction] || 65;

    // Simple position detection (kept for non-ideation debates)
    let position = 'neutral';
    if (lowerContent.includes('strongly agree') || lowerContent.includes('absolutely')) {
      position = 'strongly-agree';
    } else if (lowerContent.includes('agree') || lowerContent.includes('support')) {
      position = 'agree';
    } else if (lowerContent.includes('strongly disagree') || lowerContent.includes('completely oppose')) {
      position = 'strongly-disagree';
    } else if (lowerContent.includes('disagree') || lowerContent.includes('oppose')) {
      position = 'disagree';
    } else if (lowerContent.includes('balanced') || lowerContent.includes('both sides')) {
      position = 'neutral';
    }

    return { position, confidence, conviction };
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

      // Check for ideation mode - use specialized ideation judge analysis
      if (debate.style === 'ideation') {
        const result = await this.generateIdeationJudgeAnalysis(debate, judgeModel);
        await prisma.$disconnect();
        return result;
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

  /**
   * Generate ideation-specific judge analysis that summarizes the journey
   * from initial ideas → critiques → votes → refinement → winner
   */
  async generateIdeationJudgeAnalysis(debate, judgeModel) {
    console.log('[IdeationJudge] Generating ideation-aware analysis');

    // Extract key moments from each round
    const roundData = {};
    debate.debateRounds.forEach(round => {
      roundData[round.roundNumber] = round.responses.map(r => ({
        modelId: r.modelId,
        content: r.content
      }));
    });

    // Build context for the ideation journey
    let journeyContext = '';

    // Round 1: Initial ideas
    if (roundData[1]) {
      journeyContext += '=== ROUND 1: INITIAL IDEAS ===\n';
      roundData[1].forEach(r => {
        journeyContext += `${r.modelId}:\n${r.content.substring(0, 800)}\n\n`;
      });
    }

    // Round 3: Key critiques (summarized)
    if (roundData[3]) {
      journeyContext += '\n=== ROUND 3: KEY CRITIQUES ===\n';
      roundData[3].forEach(r => {
        journeyContext += `${r.modelId}:\n${r.content.substring(0, 500)}\n\n`;
      });
    }

    // Round 4: Rework
    if (roundData[4]) {
      journeyContext += '\n=== ROUND 4: REWORK RESPONSES ===\n';
      roundData[4].forEach(r => {
        journeyContext += `${r.modelId}:\n${r.content.substring(0, 500)}\n\n`;
      });
    }

    // Round 5: Votes
    if (roundData[5]) {
      journeyContext += '\n=== ROUND 5: VOTES ===\n';
      roundData[5].forEach(r => {
        journeyContext += `${r.modelId}:\n${r.content.substring(0, 600)}\n\n`;
      });
    }

    // Round 8: Final decisions
    if (roundData[8]) {
      journeyContext += '\n=== ROUND 8: FINAL DECISIONS ===\n';
      roundData[8].forEach(r => {
        journeyContext += `${r.modelId}:\n${r.content.substring(0, 600)}\n\n`;
      });
    }

    const prompt = `You are summarizing an IDEATION session where multiple AI models generated, critiqued, voted on, and refined ideas.

Topic: "${debate.topic}"
${debate.description ? `Context: ${debate.description}\n` : ''}

${journeyContext}

YOUR TASK: Create a clear summary of the ideation outcome.

Provide your analysis in this EXACT format:

## THE WINNING IDEA
[Name the winning idea and describe it in 2-3 sentences]

## VOTE TALLY
[List how many models voted for each top idea in Round 5 and Round 8]
[Format: "Idea Name: X votes"]

## THE JOURNEY
[2-3 sentences summarizing how we got from initial brainstorming to this winner]
[What critiques did it survive? What made it stand out?]

## RUNNER-UP VALUE
[What was the second-place idea? Is there anything worth preserving from it?]

## BOTTOM LINE
[One clear sentence recommendation: "For [topic], the winning idea is [X] because [Y]"]

IMPORTANT:
- Extract the ACTUAL winning idea name, don't just say "the consensus choice"
- Count actual votes from Round 4 and Round 7
- Be specific about what the winning idea IS, not just that it won`;

    try {
      let judgeResponse;

      // Normalize judge model
      let normalizedModel = judgeModel;
      if (judgeModel === 'claude-3-5-sonnet') {
        normalizedModel = 'claude-sonnet-4-5-20250929';
      }

      if (normalizedModel.includes('claude') && this.anthropic) {
        const response = await this.anthropic.messages.create({
          model: normalizedModel,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1200,
          temperature: 0.3
        });
        judgeResponse = response.content[0].text;
      } else if (this.openai) {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1200,
          temperature: 0.3
        });
        judgeResponse = response.choices[0].message.content;
      } else {
        throw new Error('No AI API configured for ideation judge analysis');
      }

      // Extract winner from ideation analysis
      const winnerMatch = judgeResponse.match(/## THE WINNING IDEA\s*\n([^\n]+)/i);
      let winner = null;
      if (winnerMatch) {
        const winnerText = winnerMatch[1].trim();
        winner = {
          id: winnerText.substring(0, 50),
          name: winnerText.substring(0, 50),
          type: 'idea',
          reason: 'Won the ideation process through voting and refinement'
        };
      }

      return {
        analysis: judgeResponse,
        winner,
        scores: {} // Ideation doesn't use per-model scores
      };

    } catch (error) {
      console.error('[IdeationJudge] Error:', error);
      return {
        analysis: `Error generating ideation analysis: ${error.message}`,
        winner: null,
        scores: {}
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





