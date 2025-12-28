import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const debate = await prisma.debate.findUnique({
      where: { id },
      include: {
        modelSelections: true,
        debateRounds: {
          include: {
            responses: {
              orderBy: {
                createdAt: 'asc'
              }
            }
          },
          orderBy: {
            roundNumber: 'asc'
          }
        },
        scores: true
      }
    });

    if (!debate) {
      return NextResponse.json(
        { error: 'Debate not found' },
        { status: 404 }
      );
    }

    // Transform to match frontend expectations
    const response = {
      id: debate.id,
      status: debate.status,
      currentRound: debate.currentRound,
      totalRounds: debate.rounds,
      topic: debate.topic,
      description: debate.description,
      style: debate.style,
      analysisDepth: debate.analysisDepth,
      profileContext: debate.profileContext,
      errorMessage: debate.errorMessage,
      createdAt: debate.createdAt,
      startedAt: debate.startedAt,
      completedAt: debate.completedAt,
      finalSynthesis: debate.finalSynthesis,
      judgeAnalysis: debate.judgeAnalysis,
      winner: debate.winnerId ? {
        id: debate.winnerId,
        name: debate.winnerName,
        type: debate.winnerType,
        reason: debate.victoryReason
      } : null,
      scores: debate.scores.map(s => ({
        id: s.participantId,
        name: s.participantName,
        score: s.totalScore
      })),
      rounds: debate.debateRounds.map(round => ({
        roundNumber: round.roundNumber,
        consensus: round.consensus,
        keyDisagreements: round.keyDisagreements,
        responses: round.responses.map(r => ({
          modelId: r.modelId,
          round: round.roundNumber,
          content: r.content,
          position: r.position,
          confidence: r.confidence,
          timestamp: r.createdAt,
          isHuman: r.isHuman,
          userId: r.userId
        }))
      })),
      models: debate.modelSelections.map(m => ({
        id: m.modelId,
        provider: m.provider,
        name: m.name,
        displayName: m.displayName || m.name
      }))
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching debate status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch debate status' },
      { status: 500 }
    );
  }
}
