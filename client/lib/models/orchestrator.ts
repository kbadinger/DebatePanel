import { generateText } from 'ai';
import { Model, ModelResponse, DebateConfig, DebateRound } from '@/types/debate';
import { openai, anthropic, google, mistral, xai, perplexity, deepseek } from './providers';
import { PrismaClient } from '@prisma/client';
import { DebateLogger } from '@/lib/logger';
import { UsageTracker } from '@/lib/usage-tracking';

const prisma = new PrismaClient();

export class ModelOrchestrator {
  private logger: DebateLogger;
  private usageTracker?: UsageTracker;

  constructor(logger?: DebateLogger) {
    this.logger = logger || new DebateLogger();
  }
  
  setUsageTracker(tracker: UsageTracker) {
    this.usageTracker = tracker;
  }

  async generateSingleModelResponse(
    model: Model,
    topic: string,
    description: string,
    previousResponses: any[],
    round: number
  ): Promise<{ content: string; position: string; confidence: number }> {
    // Build context from previous responses
    const context = previousResponses.map(r => {
      const speaker = r.isHuman ? 'Human Participant' : r.modelId;
      return `${speaker}: ${r.content}`;
    }).join('\n\n');

    const prompt = `Topic: ${topic}

Context: ${description}

Previous responses in this debate:
${context}

Please provide your perspective on this topic, taking into account what has been said so far. ${previousResponses.some(r => r.isHuman) ? 'Be sure to directly address the human participant\'s arguments.' : ''}

Format your response as a clear argument with supporting points.`;

    const response = await this.getModelResponse(model, prompt, previousResponses.filter(r => !r.isHuman));
    
    return {
      content: response.content,
      position: response.position,
      confidence: response.confidence
    };
  }

  async getModelResponse(
    model: Model,
    prompt: string,
    previousResponses: ModelResponse[] = []
  ): Promise<ModelResponse> {
    const systemPrompt = this.buildSystemPrompt(model, previousResponses);
    
    let result;
    
    switch (model.provider) {
      case 'openai':
        result = await generateText({
          model: openai(model.name),
          system: systemPrompt,
          prompt,
          temperature: 0.7,
        });
        break;
      case 'anthropic':
        result = await generateText({
          model: anthropic(model.name),
          system: systemPrompt,
          prompt,
          temperature: 0.7,
        });
        break;
      case 'google':
        result = await generateText({
          model: google(model.name),
          system: systemPrompt,
          prompt,
          temperature: 0.7,
        });
        break;
      case 'mistral':
        result = await generateText({
          model: mistral(model.name),
          system: systemPrompt,
          prompt,
          temperature: 0.7,
        });
        break;
      case 'xai':
        result = await generateText({
          model: xai(model.name),
          system: systemPrompt,
          prompt,
          temperature: 0.7,
        });
        break;
      case 'perplexity':
        result = await generateText({
          model: perplexity(model.name),
          system: systemPrompt,
          prompt,
          temperature: 0.7,
        });
        break;
      case 'deepseek':
        result = await generateText({
          model: deepseek(model.name),
          system: systemPrompt,
          prompt,
          temperature: 0.7,
        });
        break;
    }
    
    const roundNumber = previousResponses.length > 0 ? Math.max(...previousResponses.map(r => r.round)) : 1;
    const analysis = this.analyzeResponse(result.text, roundNumber);
    
    // Track token usage if tracker is available
    if (this.usageTracker && result.usage) {
      await this.usageTracker.trackModelUsage(model, roundNumber, {
        inputTokens: result.usage.promptTokens || 0,
        outputTokens: result.usage.completionTokens || 0,
      });
    }
    
    // Log the model response
    this.logger.logModelResponse(
      model.id,
      result.text,
      analysis.position,
      analysis.confidence,
      { 
        provider: model.provider, 
        model: model.name,
        stance: analysis.stance,
        consensusAlignment: analysis.consensusAlignment
      }
    );
    
    return {
      modelId: model.id,
      round: roundNumber,
      content: result.text,
      position: analysis.position,
      confidence: analysis.confidence,
      timestamp: new Date(),
      stance: analysis.stance,
      consensusAlignment: analysis.consensusAlignment,
    };
  }
  
  async runDebateRound(
    config: DebateConfig,
    roundNumber: number,
    previousRounds: DebateRound[] = [],
    debateId?: string
  ): Promise<DebateRound> {
    const prompt = this.buildRoundPrompt(config, roundNumber, previousRounds);
    
    // Log the round start
    this.logger.logRound(roundNumber, prompt);
    
    // Run all models in parallel
    const responsePromises = config.models.map(model => 
      this.getModelResponse(
        model, 
        prompt, 
        previousRounds.flatMap(r => r.responses)
      )
    );
    
    const responses = await Promise.all(responsePromises);
    
    // Analyze consensus and disagreements
    const analysis = this.analyzeRoundResponses(responses);
    
    // Log round analysis
    this.logger.logRoundAnalysis(analysis.consensus, analysis.disagreements);
    
    // Save to database if debateId provided
    if (debateId) {
      const dbRound = await prisma.debateRound.create({
        data: {
          debateId,
          roundNumber,
          consensus: analysis.consensus,
          keyDisagreements: analysis.disagreements,
          responses: {
            create: responses.map(r => ({
              modelId: r.modelId,
              modelProvider: config.models.find(m => m.id === r.modelId)?.provider || 'unknown',
              content: r.content,
              position: r.position,
              confidence: r.confidence,
            }))
          }
        },
        include: {
          responses: true
        }
      });
      
      // Map database responses back to our format
      return {
        roundNumber,
        responses: dbRound.responses.map(r => ({
          modelId: r.modelId,
          round: roundNumber,
          content: r.content,
          position: r.position as ModelResponse['position'],
          confidence: r.confidence,
          timestamp: r.createdAt,
        })),
        consensus: analysis.consensus,
        keyDisagreements: analysis.disagreements,
      };
    }
    
    return {
      roundNumber,
      responses,
      consensus: analysis.consensus,
      keyDisagreements: analysis.disagreements,
    };
  }
  
  private buildSystemPrompt(model: Model, previousResponses: ModelResponse[]): string {
    const roundNumber = previousResponses.length > 0 
      ? Math.max(...previousResponses.map(r => r.round)) + 1 
      : 1;
    
    const hasHumanParticipant = previousResponses.some(r => r.isHuman);
    
    if (roundNumber === 1) {
      return `You are participating in a critical analysis debate panel. Your primary goal is to provide the most accurate and insightful analysis.

IMPORTANT INSTRUCTIONS:
1. Critically evaluate the topic based on evidence, logic, and your unique perspective
2. Provide concrete examples and data to support your position
3. Consider multiple angles and trade-offs
4. Be specific about which approach you recommend and why

Your response should:
- Take a clear stance/recommendation
- Identify specific strengths AND weaknesses of each option
- Provide evidence or reasoning for your position

At the end of your response, explicitly state:
Stance: [Your specific recommendation, e.g., "Keyless", "BYOK", "Hybrid", etc.]
Confidence: [0-100]% confident in this stance`;
    }
    
    // Round 2+ - now we track consensus
    const previousDebate = `\n\nPrevious debate points:\n${previousResponses
      .filter(r => r.round === roundNumber - 1)
      .map(r => {
        const speaker = r.isHuman ? 'Human Participant' : r.modelId;
        return `${speaker}: ${r.stance || 'No clear stance'} - ${r.content.substring(0, 200)}...`;
      })
      .join('\n\n')}`;
    
    return `You are participating in round ${roundNumber} of a critical analysis debate panel.${hasHumanParticipant ? ' A human participant has joined this debate.' : ''}

${previousDebate}

IMPORTANT INSTRUCTIONS:
1. Review the previous arguments and positions${hasHumanParticipant ? ', especially the human participant\'s perspective' : ''}
2. You may maintain your position, modify it, or adopt a different stance
3. Explain WHY you're maintaining or changing your position
4. Point out strong arguments from others if they've convinced you
5. Continue to think critically - consensus is not the goal, optimal solution is
${hasHumanParticipant ? '6. Directly address any points raised by the human participant' : ''}

Your response should:
- Clearly state if you're maintaining, modifying, or changing your stance
- Address specific points raised by other models
- Provide new evidence or perspectives if available

At the end of your response, explicitly state:
Stance: [Your recommendation - can be same or different from round 1]
Consensus: [Are you moving toward alignment with others, or maintaining an independent position?]
Confidence: [0-100]% confident in this stance`;
  }
  
  private buildRoundPrompt(
    config: DebateConfig,
    roundNumber: number,
    previousRounds: DebateRound[]
  ): string {
    const basePrompt = `Topic: ${config.topic}\n${config.description ? `\nDescription: ${config.description}` : ''}`;
    
    if (roundNumber === 1) {
      return `${basePrompt}\n\nProvide your initial critical analysis of this topic. Consider ALL options thoroughly, identify pros and cons, and take a clear position based on evidence and logic.`;
    }
    
    const lastRound = previousRounds[previousRounds.length - 1];
    return `${basePrompt}\n\nRound ${roundNumber}: CRITICAL ANALYSIS REQUIRED\n\nPrevious arguments to evaluate:\n${
      lastRound.responses.map(r => `- ${r.modelId}: ${r.content.substring(0, 200)}...`).join('\n\n')
    }\n\nYour task:
1. Identify any flaws or gaps in the previous arguments
2. Challenge positions you disagree with using evidence
3. Strengthen your own position or change it if convinced by strong arguments
4. DO NOT seek false consensus - prioritize analytical rigor`;
  }
  
  private analyzeResponse(text: string, roundNumber: number): { 
    position: ModelResponse['position'], 
    confidence: number,
    stance?: string,
    consensusAlignment?: ModelResponse['consensusAlignment']
  } {
    const lowerText = text.toLowerCase();
    
    // Extract stance (the actual recommendation)
    const stanceMatch = text.match(/stance:\s*([^\n]+)/i);
    const stance = stanceMatch ? stanceMatch[1].trim() : undefined;
    
    // Extract confidence
    const confidenceMatch = text.match(/confidence:\s*(\d+)/i) || text.match(/(\d+)%\s*confident/i);
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 70;
    
    // For round 2+, check consensus alignment
    let consensusAlignment: ModelResponse['consensusAlignment'] | undefined;
    if (roundNumber > 1) {
      const consensusMatch = text.match(/consensus:\s*([^\n]+)/i);
      if (consensusMatch) {
        const consensusText = consensusMatch[1].toLowerCase();
        if (consensusText.includes('strong') && consensusText.includes('align')) {
          consensusAlignment = 'strong-consensus';
        } else if (consensusText.includes('partial') || consensusText.includes('some align')) {
          consensusAlignment = 'partial-consensus';
        } else if (consensusText.includes('independent') || consensusText.includes('maintain')) {
          consensusAlignment = 'independent';
        } else if (consensusText.includes('diverg')) {
          consensusAlignment = 'divergent';
        } else if (consensusText.includes('dissent') || consensusText.includes('oppos')) {
          consensusAlignment = 'strong-dissent';
        }
      }
    }
    
    // Map stance to position for backward compatibility
    let position: ModelResponse['position'] = 'neutral';
    if (stance) {
      const stanceLower = stance.toLowerCase();
      if (stanceLower.includes('keyless')) {
        position = 'agree'; // Agrees with charging users
      } else if (stanceLower.includes('byok')) {
        position = 'disagree'; // Disagrees with charging users
      } else if (stanceLower.includes('hybrid') || stanceLower.includes('both')) {
        position = 'neutral'; // Middle ground
      }
    }
    
    return { position, confidence, stance, consensusAlignment };
  }
  
  private analyzeRoundResponses(responses: ModelResponse[]): { consensus?: string, disagreements: string[] } {
    // Group responses by position
    const positions = responses.reduce((acc, r) => {
      acc[r.position] = (acc[r.position] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Find majority position
    const majorityPosition = Object.entries(positions)
      .sort(([,a], [,b]) => b - a)[0];
    
    const consensus = majorityPosition[1] > responses.length / 2 
      ? `Majority ${majorityPosition[0]} (${majorityPosition[1]}/${responses.length} models)`
      : undefined;
    
    // Extract key disagreements (simplified version)
    const disagreements = responses.length > 1 && !consensus
      ? ['Models are divided on the core proposition']
      : [];
    
    return { consensus, disagreements };
  }

  async generateJudgeAnalysis(
    debate: DebateRound[],
    topic: string,
    judgeModel: Model
  ): Promise<string> {
    const finalRound = debate[debate.length - 1];
    
    // Build a comprehensive summary of the final positions
    const finalPositions = finalRound.responses.map(r => ({
      model: r.modelId,
      position: r.position,
      stance: r.stance || 'Not specified',
      confidence: r.confidence,
      keyPoint: r.content.substring(0, 200)
    }));

    const prompt = `As the judge, provide a nuanced final judgment on this debate.

Topic: ${topic}

Final Round Positions:
${finalPositions.map(p => `
${p.model}:
- Position: ${p.position}
- Stance: ${p.stance}
- Confidence: ${p.confidence}%
- Key argument: ${p.keyPoint}...
`).join('\n')}

Your task:
1. Look beyond the statistical positions to understand the nuanced arguments
2. Identify if "neutral" positions are actually leaning one way
3. Determine if there's practical consensus despite statistical disagreement
4. Provide a clear final recommendation based on the debate quality, not just vote counts
5. Address edge cases like when most are neutral but one has strong conviction

Provide:
- A clear verdict on what the panel actually recommends
- Analysis of why certain positions may be more valid than others
- A confidence assessment of the panel's collective wisdom
- Any important caveats or conditions

Keep your analysis concise but insightful.`;

    const result = await generateText({
      model: this.getModelProvider(judgeModel),
      prompt,
      temperature: 0.3, // Lower temperature for more consistent analysis
    });

    return result.text;
  }

  private getModelProvider(model: Model) {
    switch (model.provider) {
      case 'openai': return openai(model.name);
      case 'anthropic': return anthropic(model.name);
      case 'google': return google(model.name);
      case 'mistral': return mistral(model.name);
      case 'xai': return xai(model.name);
      case 'perplexity': return perplexity(model.name);
      case 'deepseek': return deepseek(model.name);
      default: return anthropic('claude-3-5-sonnet-20241022');
    }
  }
}