import { NextResponse } from 'next/server';
import { PROVIDER_API_KEYS } from '@/lib/models/provider-config';
import { ModelProvider } from '@/types/debate';

export async function GET() {
  // Check which providers have API keys configured
  const configuredProviders: ModelProvider[] = [];
  
  for (const [provider, envVar] of Object.entries(PROVIDER_API_KEYS) as [ModelProvider, string][]) {
    if (process.env[envVar]) {
      configuredProviders.push(provider);
    }
  }
  
  return NextResponse.json({ configuredProviders });
}