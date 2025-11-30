import { PrismaClient } from '@prisma/client';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { PublicDebateView } from '@/components/debate/PublicDebateView';

const prisma = new PrismaClient();

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const debate = await prisma.debate.findFirst({
    where: {
      OR: [
        { publicSlug: slug },
        { id: slug }
      ],
      isPublic: true,
    },
    select: { topic: true, description: true }
  });

  if (!debate) {
    return { title: 'Debate Not Found | DecisionForge' };
  }

  return {
    title: `${debate.topic} | DecisionForge`,
    description: debate.description || `AI models debate: ${debate.topic}`,
    openGraph: {
      title: debate.topic,
      description: debate.description || `Watch AI models debate: ${debate.topic}`,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: debate.topic,
      description: debate.description || `Watch AI models debate: ${debate.topic}`,
    },
  };
}

export default async function PublicDebatePage({ params }: Props) {
  const { slug } = await params;

  const debate = await prisma.debate.findFirst({
    where: {
      OR: [
        { publicSlug: slug },
        { id: slug }
      ],
      isPublic: true,
    },
    include: {
      modelSelections: true,
      debateRounds: {
        include: {
          responses: true
        },
        orderBy: {
          roundNumber: 'asc'
        }
      },
      scores: {
        orderBy: {
          totalScore: 'desc'
        }
      }
    }
  });

  if (!debate) {
    notFound();
  }

  // Transform to client format
  const debateData = {
    id: debate.id,
    topic: debate.topic,
    description: debate.description,
    status: debate.status,
    createdAt: debate.createdAt.toISOString(),
    completedAt: debate.completedAt?.toISOString(),
    finalSynthesis: debate.finalSynthesis,
    judgeAnalysis: debate.judgeAnalysis,
    winner: debate.winnerId ? {
      id: debate.winnerId,
      name: debate.winnerName,
      type: debate.winnerType,
      reason: debate.victoryReason
    } : null,
    models: debate.modelSelections.map(ms => ({
      id: ms.modelId,
      provider: ms.provider,
      name: ms.name
    })),
    rounds: debate.debateRounds.map(round => ({
      roundNumber: round.roundNumber,
      consensus: round.consensus,
      keyDisagreements: round.keyDisagreements,
      responses: round.responses.map(r => ({
        modelId: r.modelId,
        modelProvider: r.modelProvider,
        content: r.content,
        position: r.position,
        confidence: r.confidence,
        isHuman: r.isHuman,
        argumentScore: r.argumentScore
      }))
    })),
    scores: debate.scores.map(s => ({
      participantId: s.participantId,
      participantName: s.participantName,
      participantType: s.participantType,
      totalScore: s.totalScore
    }))
  };

  return <PublicDebateView debate={debateData} />;
}
