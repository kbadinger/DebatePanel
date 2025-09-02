import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const debate = await prisma.debate.findUnique({
      where: { id: params.id },
      include: {
        debateRounds: {
          include: {
            responses: true
          },
          orderBy: {
            roundNumber: 'asc'
          }
        }
      }
    });

    if (!debate) {
      return NextResponse.json({ error: 'Debate not found' }, { status: 404 });
    }

    // Check if user has access to this debate
    if (debate.userId !== session.user.id && !session.user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Debug: Log the debate structure
    console.log('Debate structure for download:', {
      id: debate.id,
      hasConfig: !!debate.config,
      config: debate.config,
      topic: debate.topic,
      description: debate.description,
      status: debate.status,
      roundsCount: debate.debateRounds?.length
    });

    // Generate markdown content
    const markdown = generateDebateMarkdown(debate);

    // Return as downloadable file
    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown',
        'Content-Disposition': `attachment; filename="debate-${debate.id}-full.md"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Error downloading debate:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateDebateMarkdown(debate: any): string {
  const createdAt = new Date(debate.createdAt).toLocaleString();
  
  // Safely access config properties
  const config = debate.config || {};
  const topic = config.topic || debate.topic || 'Debate Topic';
  const description = config.description || debate.description || 'No description available';
  const models = config.models || [];
  
  let markdown = `# ${topic}\n\n`;
  markdown += `**Description:** ${description}\n\n`;
  markdown += `**Date:** ${createdAt}\n\n`;
  markdown += `**Status:** ${debate.status}\n\n`;
  markdown += `**Models:** ${models.map((m: any) => m.displayName || m.name || m.id).join(', ')}\n\n`;
  markdown += `---\n\n`;

  // Add each round
  for (const round of debate.debateRounds || []) {
    markdown += `## Round ${round.roundNumber}\n\n`;
    
    for (const response of round.responses || []) {
      const model = models.find((m: any) => m.id === response.modelId);
      markdown += `### ${model?.displayName || model?.name || response.modelId}\n\n`;
      markdown += `**Position:** ${response.position || 'Unknown'}\n\n`;
      markdown += `**Confidence:** ${response.confidence || 0}%\n\n`;
      markdown += `${response.content || 'No content available'}\n\n`;
      markdown += `---\n\n`;
    }
  }

  // Add judge analysis if available
  if (debate.judgeAnalysis) {
    markdown += `## 🏛️ Judge's Analysis\n\n`;
    markdown += `${debate.judgeAnalysis}\n\n`;
    markdown += `---\n\n`;
  }

  // Add synthesis if available
  if (debate.finalSynthesis) {
    markdown += `## 📊 Final Synthesis\n\n`;
    markdown += `${debate.finalSynthesis}\n\n`;
  }

  // Add winner information if available
  if (debate.winnerId) {
    markdown += `## 🏆 Winner\n\n`;
    markdown += `**Winner:** ${debate.winnerName}\n\n`;
    markdown += `**Reason:** ${debate.victoryReason}\n\n`;
  }

  return markdown;
}
