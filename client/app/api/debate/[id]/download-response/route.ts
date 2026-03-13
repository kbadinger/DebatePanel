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

    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get('modelId');
    const round = searchParams.get('round');

    if (!modelId || !round) {
      return NextResponse.json({ error: 'Missing modelId or round parameter' }, { status: 400 });
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

    // Find the specific response
    const targetRound = debate.debateRounds.find(r => r.roundNumber === parseInt(round));
    const response = targetRound?.responses.find(r => r.modelId === modelId);

    if (!response) {
      return NextResponse.json({ error: 'Response not found' }, { status: 404 });
    }

    // Generate markdown for this specific response
    const config = debate.config || {};
    const topic = config.topic || debate.topic || 'Debate Topic';
    const models = config.models || [];
    const model = models.find((m: any) => m.id === modelId);

    const markdown = `# ${model?.displayName || modelId} - Round ${round}

**Debate Topic:** ${topic}

**Position:** ${response.position}

**Confidence:** ${response.confidence}%

**Stance:** ${response.stance || 'Not specified'}

---

## Response

${response.content}

---

*Generated from debate ${params.id} on ${new Date(debate.createdAt).toLocaleString()}*
`;

    // Return as downloadable file
    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown',
        'Content-Disposition': `attachment; filename="${model?.displayName || modelId}-round-${round}.md"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Error downloading response:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
