#!/usr/bin/env tsx

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function fetchOpenAIModels() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found in .env.local');
    console.log('Please add your OpenAI API key to .env.local file');
    process.exit(1);
  }

  try {
    console.log('🔄 Fetching available models from OpenAI API...\n');
    
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Filter and sort models
    const models = data.data
      .filter((model: any) => {
        // Filter for models that are typically used for chat/completion
        const id = model.id.toLowerCase();
        return (
          id.includes('gpt') ||
          id.includes('o1') ||
          id.includes('o3') ||
          id.includes('davinci') ||
          id.includes('turbo') ||
          id.includes('whisper') === false && // exclude whisper
          id.includes('embedding') === false && // exclude embeddings
          id.includes('tts') === false && // exclude text-to-speech
          id.includes('dall-e') === false // exclude image generation
        );
      })
      .sort((a: any, b: any) => {
        // Sort by created date (newest first)
        return b.created - a.created;
      });

    console.log('📋 Available OpenAI Models for Chat/Completion:\n');
    console.log('=' .repeat(60));
    
    // Group models by type
    const gpt5Models = models.filter((m: any) => m.id.includes('gpt-5'));
    const gpt4Models = models.filter((m: any) => m.id.includes('gpt-4'));
    const o1Models = models.filter((m: any) => m.id.startsWith('o1'));
    const o3Models = models.filter((m: any) => m.id.startsWith('o3'));
    const gpt3Models = models.filter((m: any) => m.id.includes('gpt-3'));
    const otherModels = models.filter((m: any) => 
      !m.id.includes('gpt') && !m.id.startsWith('o1') && !m.id.startsWith('o3')
    );

    const printModels = (title: string, modelList: any[]) => {
      if (modelList.length > 0) {
        console.log(`\n${title}:`);
        modelList.forEach((model: any) => {
          const date = new Date(model.created * 1000).toLocaleDateString();
          console.log(`  • ${model.id} (created: ${date})`);
        });
      }
    };

    printModels('🚀 GPT-5 Models', gpt5Models);
    printModels('🎯 o3 Models (Reasoning)', o3Models);
    printModels('🧠 o1 Models (Reasoning)', o1Models);
    printModels('⚡ GPT-4 Models', gpt4Models);
    printModels('💡 GPT-3.5 Models', gpt3Models);
    printModels('🔧 Other Models', otherModels);

    console.log('\n' + '=' .repeat(60));
    console.log(`\n✅ Total models found: ${models.length}\n`);

    // Generate code snippet for config.ts
    console.log('📝 Suggested config.ts entries for the latest models:\n');
    console.log('```typescript');
    
    // Pick the most relevant/latest models
    const suggestedModels = [
      ...gpt5Models.slice(0, 3),
      ...o3Models.slice(0, 2),
      ...o1Models.slice(0, 2),
      ...gpt4Models.slice(0, 2),
      ...gpt3Models.slice(0, 1),
    ].slice(0, 10); // Limit to 10 models

    suggestedModels.forEach((model: any) => {
      const displayName = model.id
        .split('-')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
        .replace('Gpt', 'GPT')
        .replace('O1', 'o1')
        .replace('O3', 'o3');
      
      console.log(`  withCostInfo({
    id: '${model.id}',
    provider: 'openai',
    name: '${model.id}',
    displayName: '${displayName}'
  }),`);
    });
    
    console.log('```');

  } catch (error) {
    console.error('❌ Error fetching models:', error);
    if (error instanceof Error && error.message.includes('401')) {
      console.log('\n⚠️  Your API key might be invalid or expired.');
    }
  }
}

// Run the script
fetchOpenAIModels();