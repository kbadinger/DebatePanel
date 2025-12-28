import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MAX_PROFILES_PER_USER = 10;
const MAX_CONTENT_SIZE = 10 * 1024; // 10KB

// GET /api/profiles - Get all profiles for current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const profiles = await prisma.profile.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json({ profiles });
  } catch (error) {
    console.error('Error fetching profiles:', error);
    return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
  }
}

// POST /api/profiles - Create a new profile
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, content } = body;

    // Validate name: 2-30 chars, alphanumeric + hyphens only
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const trimmedName = name.trim().toLowerCase();
    if (trimmedName.length < 2 || trimmedName.length > 30) {
      return NextResponse.json({ error: 'Name must be 2-30 characters' }, { status: 400 });
    }

    if (!/^[a-z0-9-]+$/.test(trimmedName)) {
      return NextResponse.json({ error: 'Name can only contain letters, numbers, and hyphens' }, { status: 400 });
    }

    // Validate content is an object
    if (!content || typeof content !== 'object') {
      return NextResponse.json({ error: 'Content must be a JSON object' }, { status: 400 });
    }

    // Check content size
    const contentStr = JSON.stringify(content);
    if (contentStr.length > MAX_CONTENT_SIZE) {
      return NextResponse.json({ error: `Content exceeds maximum size of ${MAX_CONTENT_SIZE / 1024}KB` }, { status: 400 });
    }

    // Check profile limit
    const profileCount = await prisma.profile.count({
      where: { userId: user.id }
    });

    if (profileCount >= MAX_PROFILES_PER_USER) {
      return NextResponse.json({ error: `Maximum ${MAX_PROFILES_PER_USER} profiles allowed` }, { status: 400 });
    }

    // Check for duplicate name
    const existing = await prisma.profile.findUnique({
      where: {
        userId_name: {
          userId: user.id,
          name: trimmedName
        }
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'Profile with this name already exists' }, { status: 409 });
    }

    // Create profile
    const profile = await prisma.profile.create({
      data: {
        userId: user.id,
        name: trimmedName,
        content
      }
    });

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    console.error('Error creating profile:', error);
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
  }
}
