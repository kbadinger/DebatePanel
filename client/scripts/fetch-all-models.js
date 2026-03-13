#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read .env.local file
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

function getApiKey(keyName) {
  const match = envContent.match(new RegExp(`${keyName}=(.+)`));
  return match ? match[1].trim() : process.env[keyName];
}

// Fetch Anthropic Models
async function fetchAnthropicModels() {
  const apiKey = getApiKey('ANTHROPIC_API_KEY');
  if (!apiKey) {
    console.log('⚠️  ANTHROPIC_API_KEY not found - skipping Anthropic models');
    return;
  }

  try {
    console.log('\n🤖 Fetching Anthropic Models...');
    
    // Anthropic doesn't have a models endpoint, but we can check latest from their docs
    // These are the known models as of 2025
    const models = [
      'claude-opus-4.1-20250807',
      'claude-opus-4.1',
      'claude-sonnet-4.1-20250807', 
      'claude-sonnet-4.1',
      'claude-haiku-4.1-20250807',
      'claude-haiku-4.1',
      'claude-3.5-sonnet-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307'
    ];
    
    console.log('  Available Claude models:');
    models.forEach(m => console.log(`    • ${m}`));
    
  } catch (error) {
    console.error('  ❌ Error with Anthropic:', error.message);
  }
}

// Fetch Google/Gemini Models
async function fetchGoogleModels() {
  const apiKey = getApiKey('GEMINI_API_KEY') || getApiKey('GOOGLE_API_KEY');
  if (!apiKey) {
    console.log('⚠️  GEMINI_API_KEY not found - skipping Google models');
    return;
  }

  try {
    console.log('\n💎 Fetching Google Gemini Models...');
    
    const response = await fetch('https://generativelanguage.googleapis.com/v1/models?key=' + apiKey);
    
    if (response.ok) {
      const data = await response.json();
      const models = data.models
        .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
        .map(m => m.name.replace('models/', ''));
      
      console.log('  Available Gemini models:');
      models.forEach(m => console.log(`    • ${m}`));
    } else {
      throw new Error(`API returned ${response.status}`);
    }
  } catch (error) {
    console.error('  ❌ Error with Google:', error.message);
  }
}

// Fetch OpenAI Models
async function fetchOpenAIModels() {
  const apiKey = getApiKey('OPENAI_API_KEY');
  if (!apiKey) {
    console.log('⚠️  OPENAI_API_KEY not found - skipping OpenAI models');
    return;
  }

  try {
    console.log('\n🚀 Fetching OpenAI Models...');
    
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    if (response.ok) {
      const data = await response.json();
      const models = data.data
        .filter(m => {
          const id = m.id.toLowerCase();
          return (id.includes('gpt') || id.includes('o1') || id.includes('o3')) &&
                 !id.includes('whisper') && !id.includes('embedding') && 
                 !id.includes('tts') && !id.includes('dall-e');
        })
        .map(m => m.id)
        .sort((a, b) => {
          // Sort GPT-5 first, then o3, then o1, then GPT-4
          const order = ['gpt-5', 'o3', 'o1', 'gpt-4', 'gpt-3'];
          const aIndex = order.findIndex(o => a.includes(o));
          const bIndex = order.findIndex(o => b.includes(o));
          return aIndex - bIndex;
        })
        .slice(0, 15); // Top 15 models
      
      console.log('  Latest OpenAI models:');
      models.forEach(m => console.log(`    • ${m}`));
    } else {
      throw new Error(`API returned ${response.status}`);
    }
  } catch (error) {
    console.error('  ❌ Error with OpenAI:', error.message);
  }
}

// Fetch Mistral Models
async function fetchMistralModels() {
  const apiKey = getApiKey('MISTRAL_API_KEY');
  if (!apiKey) {
    console.log('⚠️  MISTRAL_API_KEY not found - skipping Mistral models');
    return;
  }

  try {
    console.log('\n🌬️  Fetching Mistral Models...');
    
    const response = await fetch('https://api.mistral.ai/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    if (response.ok) {
      const data = await response.json();
      const models = data.data.map(m => m.id);
      
      console.log('  Available Mistral models:');
      models.forEach(m => console.log(`    • ${m}`));
    } else {
      throw new Error(`API returned ${response.status}`);
    }
  } catch (error) {
    console.error('  ❌ Error with Mistral:', error.message);
  }
}

// Fetch Cohere Models
async function fetchCohereModels() {
  const apiKey = getApiKey('COHERE_API_KEY');
  if (!apiKey) {
    console.log('⚠️  COHERE_API_KEY not found - skipping Cohere models');
    return;
  }

  try {
    console.log('\n🔮 Fetching Cohere Models...');
    
    const response = await fetch('https://api.cohere.ai/v1/models', {
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const models = data.models
        ?.filter(m => m.endpoints?.includes('generate') || m.endpoints?.includes('chat'))
        .map(m => m.name) || [];
      
      if (models.length > 0) {
        console.log('  Available Cohere models:');
        models.forEach(m => console.log(`    • ${m}`));
      } else {
        // Fallback to known models
        console.log('  Known Cohere models:');
        ['command-r-plus', 'command-r', 'command', 'command-light'].forEach(m => 
          console.log(`    • ${m}`)
        );
      }
    } else {
      throw new Error(`API returned ${response.status}`);
    }
  } catch (error) {
    console.error('  ❌ Error with Cohere:', error.message);
  }
}

// Fetch Perplexity Models
async function fetchPerplexityModels() {
  const apiKey = getApiKey('PERPLEXITY_API_KEY');
  if (!apiKey) {
    console.log('⚠️  PERPLEXITY_API_KEY not found - skipping Perplexity models');
    return;
  }

  try {
    console.log('\n🔍 Fetching Perplexity Models...');
    
    // Perplexity doesn't have a models endpoint, so we list known models
    const models = [
      'llama-3.1-sonar-large-128k-online',
      'llama-3.1-sonar-small-128k-online',
      'llama-3.1-sonar-large-128k-chat',
      'llama-3.1-sonar-small-128k-chat',
      'llama-3.1-70b-instruct',
      'llama-3.1-8b-instruct'
    ];
    
    console.log('  Known Perplexity models:');
    models.forEach(m => console.log(`    • ${m}`));
  } catch (error) {
    console.error('  ❌ Error with Perplexity:', error.message);
  }
}

// Main function
async function fetchAllModels() {
  console.log('=' .repeat(60));
  console.log('🔄 Fetching Latest Models from All Providers');
  console.log('=' .repeat(60));

  await fetchOpenAIModels();
  await fetchAnthropicModels();
  await fetchGoogleModels();
  await fetchMistralModels();
  await fetchCohereModels();
  await fetchPerplexityModels();
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ Model Discovery Complete!');
  console.log('=' .repeat(60));
  
  console.log('\n📝 To update your models:');
  console.log('1. Edit: lib/models/config.ts');
  console.log('2. Update model names with the latest versions shown above');
  console.log('3. Update pricing in: lib/models/pricing.ts');
}

// Run
fetchAllModels().catch(console.error);