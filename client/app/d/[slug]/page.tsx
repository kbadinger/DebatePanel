import { PrismaClient } from '@prisma/client';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { PublicDebateView } from '@/components/debate/PublicDebateView';

// Force dynamic rendering to always get fresh data
export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://decisionforge.ai';

  const debate = await prisma.debate.findFirst({
    where: {
      OR: [
        { publicSlug: slug },
        { id: slug }
      ],
      isPublic: true,
    },
    select: {
      topic: true,
      description: true,
      publicSlug: true,
      winnerName: true,
      modelSelections: {
        select: { name: true }
      },
      debateRounds: {
        select: {
          roundNumber: true,
          responses: {
            select: {
              modelId: true,
              confidence: true
            }
          }
        },
        orderBy: { roundNumber: 'asc' }
      }
    }
  });

  if (!debate) {
    return { title: 'Debate Not Found | DecisionForge' };
  }

  // Calculate confidence trajectory for OG image
  let startConfidence = 0;
  let endConfidence = 0;
  let confidenceDrop = 0;

  if (debate.debateRounds.length >= 2) {
    const firstRound = debate.debateRounds[0];
    const lastRound = debate.debateRounds[debate.debateRounds.length - 1];

    // Get average confidence from first and last rounds (excluding challenger)
    const firstConfidences = firstRound.responses
      .filter(r => !r.modelId.startsWith('challenger-') && r.confidence > 0)
      .map(r => r.confidence);
    const lastConfidences = lastRound.responses
      .filter(r => !r.modelId.startsWith('challenger-') && r.confidence > 0)
      .map(r => r.confidence);

    if (firstConfidences.length > 0 && lastConfidences.length > 0) {
      startConfidence = Math.round(firstConfidences.reduce((a, b) => a + b, 0) / firstConfidences.length);
      endConfidence = Math.round(lastConfidences.reduce((a, b) => a + b, 0) / lastConfidences.length);
      confidenceDrop = startConfidence - endConfidence;
    }
  }

  const debateUrl = `${baseUrl}/d/${debate.publicSlug || slug}`;
  const modelCount = debate.modelSelections?.length || 6;

  // Build compelling description based on confidence drop
  let description: string;
  if (confidenceDrop >= 10) {
    description = `${modelCount} AI models started at ${startConfidence}% confident. They ended at ${endConfidence}%. See what changed their minds.`;
  } else if (debate.winnerName) {
    description = `${modelCount} AI models debated this. Winner: ${debate.winnerName}`;
  } else {
    description = debate.description || `Watch ${modelCount} AI models debate: ${debate.topic}`;
  }

  // Dynamic OG image with confidence data
  const ogParams = new URLSearchParams({
    title: debate.topic,
    models: String(modelCount),
    ...(confidenceDrop >= 10 && {
      startConf: String(startConfidence),
      endConf: String(endConfidence)
    }),
    ...(debate.winnerName && { winner: debate.winnerName })
  });
  const ogImageUrl = `${baseUrl}/api/og?${ogParams.toString()}`;

  return {
    title: `${debate.topic} | DecisionForge`,
    description,
    openGraph: {
      title: debate.topic,
      description,
      url: debateUrl,
      siteName: 'DecisionForge',
      type: 'article',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: debate.topic,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@kbadinger',
      creator: '@kbadinger',
      title: debate.topic,
      description,
      images: [ogImageUrl],
    },
    alternates: {
      canonical: debateUrl,
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

  // Debug: Log consensus data
  console.log('[PublicDebatePage] Rounds with consensus:', debate.debateRounds.map(r => ({
    roundNumber: r.roundNumber,
    hasConsensus: !!r.consensus,
    consensusPreview: r.consensus?.substring(0, 50)
  })));

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
