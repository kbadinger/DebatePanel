#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read .env.local file
const envPath = path.resolve(process.cwd(), '.env.local');
let apiKey = process.env.OPENAI_API_KEY;

if (!apiKey && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/OPENAI_API_KEY=(.+)/);
  if (match) {
    apiKey = match[1].trim();
  }
}

if (!apiKey) {
  console.error('❌ OPENAI_API_KEY not found in .env.local');
  console.log('Please add your OpenAI API key to .env.local file');
  process.exit(1);
}

async function fetchOpenAIModels() {
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
      .filter((model) => {
        // Filter for models that are typically used for chat/completion
        const id = model.id.toLowerCase();
        return (
          (id.includes('gpt') ||
          id.includes('o1') ||
          id.includes('o3')) &&
          !id.includes('whisper') && // exclude whisper
          !id.includes('embedding') && // exclude embeddings
          !id.includes('tts') && // exclude text-to-speech
          !id.includes('dall-e') // exclude image generation
        );
      })
      .sort((a, b) => {
        // Sort by created date (newest first)
        return b.created - a.created;
      });

    console.log('📋 Available OpenAI Models for Chat/Completion:\n');
    console.log('=' .repeat(60));
    
    // Group models by type
    const gpt5Models = models.filter((m) => m.id.includes('gpt-5'));
    const gpt4Models = models.filter((m) => m.id.includes('gpt-4'));
    const o1Models = models.filter((m) => m.id.startsWith('o1'));
    const o3Models = models.filter((m) => m.id.startsWith('o3'));
    const gpt3Models = models.filter((m) => m.id.includes('gpt-3'));

    const printModels = (title, modelList) => {
      if (modelList.length > 0) {
        console.log(`\n${title}:`);
        modelList.forEach((model) => {
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

    console.log('\n' + '=' .repeat(60));
    console.log(`\n✅ Total models found: ${models.length}\n`);

    // Generate code snippet for config.ts
    console.log('📝 Here are the model IDs you can use in config.ts:\n');
    
    // Pick the most relevant/latest models
    const suggestedModels = [
      ...gpt5Models.slice(0, 3),
      ...o3Models.slice(0, 2),
      ...o1Models.slice(0, 2),
      ...gpt4Models.slice(0, 3),
      ...gpt3Models.slice(0, 1),
    ].slice(0, 12); // Limit to 12 models

    suggestedModels.forEach((model) => {
      console.log(`  • ${model.id}`);
    });

  } catch (error) {
    console.error('❌ Error fetching models:', error.message);
    if (error.message.includes('401')) {
      console.log('\n⚠️  Your API key might be invalid or expired.');
    }
  }
}

// Run the script
fetchOpenAIModels();