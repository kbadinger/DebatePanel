import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/model-requests - Get all model requests with vote counts
export async function GET() {
  try {
    const requests = await prisma.modelRequest.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        votes: {
          select: {
            voteType: true
          }
        },
        _count: {
          select: {
            votes: true
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // pending first
        { createdAt: 'desc' }
      ]
    });

    // Calculate vote scores
    const requestsWithScores = requests.map(request => {
      const upVotes = request.votes.filter(v => v.voteType === 'up').length;
      const downVotes = request.votes.filter(v => v.voteType === 'down').length;
      const score = upVotes - downVotes;
      
      return {
        ...request,
        upVotes,
        downVotes,
        score,
        votes: undefined // Remove detailed votes for privacy
      };
    });

    return NextResponse.json(requestsWithScores);
  } catch (error) {
    console.error('Error fetching model requests:', error);
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
  }
}

// POST /api/model-requests - Create a new model request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { provider, modelName, displayName, description, useCase } = body;

    // Validation
    if (!provider || !modelName || !description || !useCase) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (description.length < 20) {
      return NextResponse.json({ error: 'Description must be at least 20 characters' }, { status: 400 });
    }

    // Valid providers
    const validProviders = ['openai', 'anthropic', 'google', 'xai', 'mistral', 'meta', 'cohere', 'deepseek', 'perplexity'];
    if (!validProviders.includes(provider.toLowerCase())) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    // Valid use cases
    const validUseCases = ['reasoning', 'coding', 'creative', 'analysis', 'general', 'multimodal'];
    if (!validUseCases.includes(useCase.toLowerCase())) {
      return NextResponse.json({ error: 'Invalid use case' }, { status: 400 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check for existing request
    const existingRequest = await prisma.modelRequest.findUnique({
      where: {
        provider_modelName: {
          provider: provider.toLowerCase(),
          modelName: modelName.trim()
        }
      }
    });

    if (existingRequest) {
      return NextResponse.json({ error: 'Model already requested' }, { status: 409 });
    }

    // Rate limiting - max 3 requests per day per user
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayRequestCount = await prisma.modelRequest.count({
      where: {
        userId: user.id,
        createdAt: {
          gte: today
        }
      }
    });

    if (todayRequestCount >= 3) {
      return NextResponse.json({ error: 'Daily request limit reached (3 per day)' }, { status: 429 });
    }

    // Create the request
    const modelRequest = await prisma.modelRequest.create({
      data: {
        userId: user.id,
        provider: provider.toLowerCase(),
        modelName: modelName.trim(),
        displayName: displayName?.trim() || null,
        description: description.trim(),
        useCase: useCase.toLowerCase()
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json(modelRequest, { status: 201 });
  } catch (error) {
    console.error('Error creating model request:', error);
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
  }
}

















