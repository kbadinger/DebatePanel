import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasOpenaiAdmin: !!process.env.OPENAI_ADMIN_API_KEY,
    hasAnthropicAdmin: !!process.env.ANTHROPIC_ADMIN_API_KEY,
  });
}
