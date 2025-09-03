import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasOpenaiAdmin: !!process.env.OPENAI_ADMIN_API_KEY,
    hasAnthropicAdmin: !!process.env.ANTHROPIC_ADMIN_API_KEY,
    openaiAdminPrefix: process.env.OPENAI_ADMIN_API_KEY?.substring(0, 20) || 'missing',
    anthropicAdminPrefix: process.env.ANTHROPIC_ADMIN_API_KEY?.substring(0, 20) || 'missing',
  });
}