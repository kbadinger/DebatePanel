import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ModelOrchestrator } from '@/lib/models/orchestrator';
import { ModelResponse } from '@/types/debate';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { debateId, content, stance, confidence, position } = await request.json();

    // Verify the debate exists and user is a participant
    const debate = await prisma.debate.findUnique({
      where: { id: debateId },
      include: {
        participants: true,
        debateRounds: {
          include: {
            responses: true
          },
          orderBy: { roundNumber: 'asc' }
        },
        modelSelections: true
      }
    });

    if (!debate) {
      return NextResponse.json({ error: 'Debate not found' }, { status: 404 });
    }

    // Check if user is already a participant, if not add them
    let participant = debate.participants.find(p => p.userId === session.user.id);
    if (!participant) {
      participant = await prisma.participant.create({
        data: {
          debateId,
          userId: session.user.id,
          role: 'participant'
        }
      });
    }

    // Get the current round
    const currentRound = debate.debateRounds[debate.debateRounds.length - 1];
    if (!currentRound) {
      return NextResponse.json({ error: 'No active round' }, { status: 400 });
    }

    // Create the human response
    const humanResponse = await prisma.modelResponse.create({
      data: {
        roundId: currentRound.id,
        modelId: `human-${session.user.id}`,
        modelProvider: 'human',
        content,
        position: position || 'neutral',
        confidence: confidence || 75,
        isHuman: true,
        userId: session.user.id
      }
    });

    // Create a stream to continue the debate
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Send the human response
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'response',
          data: {
            modelId: humanResponse.modelId,
            round: currentRound.roundNumber,
            content: humanResponse.content,
            position: humanResponse.position,
            confidence: humanResponse.confidence,
            timestamp: new Date(),
            isHuman: true,
            userName: session.user.name || session.user.email
          }
        })}\n\n`));

        // Continue with AI responses
        const modelConfigs = debate.modelSelections.map(ms => ({
          id: ms.modelId,
          provider: ms.provider as 'openai' | 'anthropic' | 'google' | 'mistral' | 'xai' | 'perplexity' | 'deepseek',
          name: ms.name,
          displayName: ms.name
        }));

        // Get all previous responses including the human one
        const allResponses = [
          ...(debate.debateRounds?.flatMap(r => r.responses) || []),
          humanResponse
        ];

        // Generate AI responses for this round
        for (const model of modelConfigs) {
          try {
            const aiResponse = await generateModelResponse(
              model,
              debate.topic,
              debate.description || '',
              allResponses,
              currentRound.roundNumber
            );

            // Save to database
            const savedResponse = await prisma.modelResponse.create({
              data: {
                roundId: currentRound.id,
                modelId: model.id,
                modelProvider: model.provider,
                content: aiResponse.content,
                position: aiResponse.position,
                confidence: aiResponse.confidence
              }
            });

            // Stream the response
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'response',
              data: {
                modelId: model.id,
                round: currentRound.roundNumber,
                content: savedResponse.content,
                position: savedResponse.position,
                confidence: savedResponse.confidence,
                timestamp: new Date()
              }
            })}\n\n`));
          } catch (error) {
            console.error(`Error generating response for ${model.id}:`, error);
          }
        }

        // Check if we need another round
        if (currentRound.roundNumber < debate.rounds) {
          // Create next round
          const nextRound = await prisma.debateRound.create({
            data: {
              debateId,
              roundNumber: currentRound.roundNumber + 1
            }
          });

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'round-complete',
            data: { roundNumber: currentRound.roundNumber }
          })}\n\n`));

          // Signal waiting for human input again
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'waiting-for-human',
            data: {}
          })}\n\n`));
        } else {
          // Debate is complete
          await prisma.debate.update({
            where: { id: debateId },
            data: {
              status: 'completed',
              completedAt: new Date()
            }
          });

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'debate-complete',
            data: { id: debateId, status: 'completed' }
          })}\n\n`));
        }

        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Human input error:', error);
    return NextResponse.json(
      { error: 'Failed to process human input' },
      { status: 500 }
    );
  }
}

// Helper function to generate AI model responses
async function generateModelResponse(
  model: { id: string; provider: string; name: string; displayName: string },
  topic: string,
  description: string,
  previousResponses: Array<{ modelId: string; content: string; position: string; isHuman?: boolean }>,
  round: number
): Promise<{ content: string; position: string; confidence: number }> {
  const orchestrator = new ModelOrchestrator();
  
  // Build the context from previous responses
  const context = previousResponses.map(r => ({
    modelId: r.modelId,
    content: r.content,
    position: r.position,
    isHuman: r.isHuman || false
  }));
  
  // Generate the AI response
  const response = await orchestrator.generateSingleModelResponse(
    model as any,
    topic,
    description,
    context,
    round
  );
  
  return response;
}