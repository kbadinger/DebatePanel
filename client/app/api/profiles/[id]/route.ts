import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MAX_CONTENT_SIZE = 10 * 1024; // 10KB

// GET /api/profiles/[id] - Get a single profile
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const profile = await prisma.profile.findFirst({
      where: {
        id,
        userId: user.id
      }
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

// PUT /api/profiles/[id] - Update a profile
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Check profile exists and belongs to user
    const existing = await prisma.profile.findFirst({
      where: {
        id,
        userId: user.id
      }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, content } = body;

    const updateData: { name?: string; content?: object } = {};

    // Validate and update name if provided
    if (name !== undefined) {
      if (typeof name !== 'string') {
        return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
      }

      const trimmedName = name.trim().toLowerCase();
      if (trimmedName.length < 2 || trimmedName.length > 30) {
        return NextResponse.json({ error: 'Name must be 2-30 characters' }, { status: 400 });
      }

      if (!/^[a-z0-9-]+$/.test(trimmedName)) {
        return NextResponse.json({ error: 'Name can only contain letters, numbers, and hyphens' }, { status: 400 });
      }

      // Check for duplicate name (excluding current profile)
      if (trimmedName !== existing.name) {
        const duplicate = await prisma.profile.findUnique({
          where: {
            userId_name: {
              userId: user.id,
              name: trimmedName
            }
          }
        });

        if (duplicate) {
          return NextResponse.json({ error: 'Profile with this name already exists' }, { status: 409 });
        }
      }

      updateData.name = trimmedName;
    }

    // Validate and update content if provided
    if (content !== undefined) {
      if (typeof content !== 'object' || content === null) {
        return NextResponse.json({ error: 'Content must be a JSON object' }, { status: 400 });
      }

      const contentStr = JSON.stringify(content);
      if (contentStr.length > MAX_CONTENT_SIZE) {
        return NextResponse.json({ error: `Content exceeds maximum size of ${MAX_CONTENT_SIZE / 1024}KB` }, { status: 400 });
      }

      updateData.content = content;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const profile = await prisma.profile.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

// DELETE /api/profiles/[id] - Delete a profile
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Check profile exists and belongs to user
    const existing = await prisma.profile.findFirst({
      where: {
        id,
        userId: user.id
      }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    await prisma.profile.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting profile:', error);
    return NextResponse.json({ error: 'Failed to delete profile' }, { status: 500 });
  }
}
