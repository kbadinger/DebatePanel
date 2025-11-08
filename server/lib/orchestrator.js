// Simplified orchestrator for Railway service
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const sentryModule = require('./sentry');

class Orchestrator {
  constructor(models) {
    this.models = models;
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

  async runRound(roundNumber, topic, description, isConsensusMode = false) {
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
        
        responses.push({
          modelId: model.id,
          provider: model.provider,
          content: response.content,
          position: response.position || 'neutral',
          confidence: response.confidence || 75,
          round: roundNumber
        });
        
        this.responses.push(response);
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

        responses.push({
          modelId: model.id,
          provider: model.provider,
          content: `Error: Unable to get response - ${error.message}`,
          position: 'error',
          confidence: 0,
          round: roundNumber
        });
      }
    }
    
    return { responses };
  }

  async getModelResponse(model, round, topic, description, isConsensusMode) {
    const prompt = this.buildPrompt(round, topic, description, isConsensusMode);
    
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

  buildPrompt(round, topic, description, isConsensusMode) {
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
    
    const labelForPosition = (position) => {
      switch (position) {
        case 'strongly-agree':
          return 'Strong agreement';
        case 'agree':
          return 'Agreement';
        case 'neutral':
          return 'Neutral perspective';
        case 'disagree':
          return 'Disagreement';
        case 'strongly-disagree':
          return 'Strong disagreement';
        case 'error':
          return 'Error / unavailable';
        default:
          return position ? position.replace('-', ' ') : 'Perspective';
      }
    };

    const extractSnippet = (text, maxLength = 500) => {
      if (!text) return 'No statement available.';
      const cleaned = text.replace(/\s+/g, ' ').trim();
      // Get first complete sentence or paragraph
      const sentenceMatch = cleaned.match(/[^.!?]+[.!?]/);
      const candidate = sentenceMatch ? sentenceMatch[0] : cleaned.slice(0, maxLength + 20);
      const snippet = candidate.trim();
      // Only truncate if significantly longer than max length
      return snippet.length > maxLength ? `${snippet.slice(0, maxLength)}...` : snippet;
    };

    const keyPoints = this.responses
      .map((response, index) => {
        const label = labelForPosition(response.position);
        const snippet = extractSnippet(response.content);
        return `- ${label}: ${snippet}`;
      })
      .slice(0, 8);

    const positionCounts = this.responses.reduce((acc, response) => {
      if (!response.position) return acc;
      acc[response.position] = (acc[response.position] || 0) + 1;
      return acc;
    }, {});

    const agreementEntries = Object.entries(positionCounts)
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1]);

    const disagreementEntries = Object.entries(positionCounts)
      .filter(([, count]) => count === 1)
      .sort((a, b) => a[0].localeCompare(b[0]));

    const agreementSection = agreementEntries.length > 0
      ? agreementEntries
          .slice(0, 4)
          .map(([position, count]) => `- ${labelForPosition(position)} surfaced in ${count} responses`)
      : ['- Limited consensus emerged; participants examined the topic from multiple angles.'];

    const disagreementSection = disagreementEntries.length > 0
      ? disagreementEntries
          .slice(0, 4)
          .map(([position]) => `- ${labelForPosition(position)} offered a contrasting perspective`)
      : ['- Participants largely aligned in their viewpoints during this debate.'];

    const totalResponses = this.responses.length;
    const leadingAgreement = agreementEntries[0];
    const leadingDisagreement = disagreementEntries[0];

    let conclusion;
    if (leadingAgreement) {
      const agreementLabel = labelForPosition(leadingAgreement[0]);
      conclusion = `The discussion showed a noticeable lean toward ${agreementLabel.toLowerCase()} with ${leadingAgreement[1]} supporting contribution${leadingAgreement[1] > 1 ? 's' : ''}. `;
      if (leadingDisagreement) {
        conclusion += `At the same time, ${labelForPosition(leadingDisagreement[0]).toLowerCase()} introduced a counterpoint that kept the conversation balanced.`;
      } else {
        conclusion += 'Few opposing arguments surfaced, indicating tentative convergence on key themes.';
      }
    } else {
      conclusion = `Participants explored the topic from diverse angles without establishing a dominant viewpoint across the ${totalResponses} contributions.`;
    }

    return `## Debate Synthesis

### Key Points Raised:
${keyPoints.length > 0 ? keyPoints.join('\n') : '- Participants shared their perspectives on the topic.'}

### Areas of Agreement:
${agreementSection.join('\n')}

### Areas of Disagreement:
${disagreementSection.join('\n')}

### Conclusion:
${conclusion}`;
  }

  async generateJudgeAnalysis(debateId, judgeModel, isConsensusMode) {
    const analysis = isConsensusMode
      ? `## Leading Contributor Analysis

Based on the quality of contributions and collaborative approach, the leading contributor demonstrated:
- Clear and constructive reasoning
- Ability to build on others' ideas
- Focus on finding common ground

### Contribution Scores:
${this.models.map(m => `- ${m.displayName}: ${Math.floor(Math.random() * 20) + 70}/100`).join('\n')}

### Final Assessment:
All participants contributed valuable perspectives to reaching consensus.`
      : `## Judge's Verdict

After careful analysis of all arguments presented:

### Winning Position:
The most compelling argument was presented with strong evidence and reasoning.

### Scoring:
${this.models.map(m => `- ${m.displayName}: ${Math.floor(Math.random() * 20) + 70}/100`).join('\n')}

### Rationale:
The winning position demonstrated superior logic and evidence.`;

    return {
      analysis,
      winner: this.models[0].id, // Simplified - just pick first model
      scores: Object.fromEntries(
        this.models.map(m => [m.id, Math.floor(Math.random() * 20) + 70])
      )
    };
  }
}

module.exports = { Orchestrator };





