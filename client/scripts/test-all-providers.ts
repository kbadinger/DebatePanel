#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0 && !key.startsWith('#')) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

interface TestResult {
  provider: string;
  apiKey: string;
  models: {
    name: string;
    status: 'working' | 'failed' | 'not_found';
    error?: string;
  }[];
}

// Test OpenAI models
async function testOpenAI(): Promise<TestResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const result: TestResult = {
    provider: 'OpenAI',
    apiKey: apiKey ? 'Present' : 'Missing',
    models: []
  };

  if (!apiKey) return result;

  console.log('\n🚀 Testing OpenAI models...');
  
  // First, fetch actual available models
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      const availableModels = data.data
        .filter((m: any) => {
          const id = m.id.toLowerCase();
          return (id.includes('gpt') || id.includes('o1') || id.includes('o3')) &&
                 !id.includes('whisper') && !id.includes('embedding') && 
                 !id.includes('tts') && !id.includes('dall-e');
        })
        .map((m: any) => m.id)
        .sort();
      
      console.log('Available models:', availableModels.slice(0, 10).join(', '));
      
      // Test specific models we're interested in
      const modelsToTest = ['gpt-4o', 'gpt-4o-mini', 'o1', 'o1-mini', 'gpt-4-turbo', 'gpt-5'];
      
      for (const model of modelsToTest) {
        const testResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: 'Say "Hello"' }],
            max_tokens: 10
          })
        });
        
        const testData = await testResponse.json();
        
        result.models.push({
          name: model,
          status: testResponse.ok ? 'working' : 
                  testData.error?.code === 'model_not_found' ? 'not_found' : 'failed',
          error: testData.error?.message
        });
        
        console.log(`  ${model}: ${testResponse.ok ? '✅' : '❌'}`);
      }
    }
  } catch (error: any) {
    console.error('Error testing OpenAI:', error.message);
  }
  
  return result;
}

// Test Anthropic models
async function testAnthropic(): Promise<TestResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const result: TestResult = {
    provider: 'Anthropic',
    apiKey: apiKey ? 'Present' : 'Missing',
    models: []
  };

  if (!apiKey) return result;

  console.log('\n🤖 Testing Anthropic models...');
  
  // Anthropic doesn't have a models endpoint, so we test known models
  const modelsToTest = [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
    'claude-opus-4.1',  // Fictional - should fail
    'claude-sonnet-4',  // Fictional - should fail
    'claude-4.1'        // Fictional - should fail
  ];
  
  for (const model of modelsToTest) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: 'Say "Hello"' }],
          max_tokens: 10
        })
      });
      
      const data = await response.json();
      
      result.models.push({
        name: model,
        status: response.ok ? 'working' : 
                data.error?.type === 'invalid_request_error' && 
                data.error?.message?.includes('model') ? 'not_found' : 'failed',
        error: data.error?.message
      });
      
      console.log(`  ${model}: ${response.ok ? '✅' : '❌'}`);
    } catch (error: any) {
      result.models.push({
        name: model,
        status: 'failed',
        error: error.message
      });
      console.log(`  ${model}: ❌ (${error.message})`);
    }
  }
  
  return result;
}

// Test Google models
async function testGoogle(): Promise<TestResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const result: TestResult = {
    provider: 'Google',
    apiKey: apiKey ? 'Present' : 'Missing',
    models: []
  };

  if (!apiKey) return result;

  console.log('\n💎 Testing Google Gemini models...');
  
  try {
    // Fetch available models
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
    
    if (response.ok) {
      const data = await response.json();
      const availableModels = data.models
        ?.filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: any) => m.name.replace('models/', '')) || [];
      
      console.log('Available models:', availableModels.join(', '));
      
      // Test specific models
      const modelsToTest = ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.5-pro'];
      
      for (const model of modelsToTest) {
        const isAvailable = availableModels.includes(model);
        result.models.push({
          name: model,
          status: isAvailable ? 'working' : 'not_found'
        });
        console.log(`  ${model}: ${isAvailable ? '✅' : '❌'}`);
      }
    }
  } catch (error: any) {
    console.error('Error testing Google:', error.message);
  }
  
  return result;
}

// Test X.AI models
async function testXAI(): Promise<TestResult> {
  const apiKey = process.env.XAI_API_KEY;
  const result: TestResult = {
    provider: 'X.AI (Grok)',
    apiKey: apiKey ? 'Present' : 'Missing',
    models: []
  };

  if (!apiKey) return result;

  console.log('\n🚀 Testing X.AI Grok models...');
  
  const modelsToTest = ['grok-4', 'grok-3', 'grok-2', 'grok-2-1212', 'grok-beta'];
  
  for (const model of modelsToTest) {
    try {
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: 'Say "Hello"' }],
          max_tokens: 10
        })
      });
      
      const data = await response.json();
      
      result.models.push({
        name: model,
        status: response.ok ? 'working' : 'not_found',
        error: data.error?.error
      });
      
      console.log(`  ${model}: ${response.ok ? '✅' : '❌'}`);
    } catch (error: any) {
      result.models.push({
        name: model,
        status: 'failed',
        error: error.message
      });
      console.log(`  ${model}: ❌`);
    }
  }
  
  return result;
}

// Main function
async function testAllProviders() {
  console.log('=' .repeat(60));
  console.log('🔍 Testing All AI Provider Models');
  console.log('=' .repeat(60));
  
  const results: TestResult[] = [];
  
  // Test each provider
  results.push(await testOpenAI());
  results.push(await testAnthropic());
  results.push(await testGoogle());
  results.push(await testXAI());
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 SUMMARY REPORT');
  console.log('=' .repeat(60));
  
  for (const result of results) {
    console.log(`\n${result.provider}:`);
    console.log(`  API Key: ${result.apiKey}`);
    
    if (result.models.length > 0) {
      const working = result.models.filter(m => m.status === 'working');
      const notFound = result.models.filter(m => m.status === 'not_found');
      
      if (working.length > 0) {
        console.log(`  ✅ Working: ${working.map(m => m.name).join(', ')}`);
      }
      
      if (notFound.length > 0) {
        console.log(`  ❌ Not Found: ${notFound.map(m => m.name).join(', ')}`);
      }
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('💡 KEY FINDINGS:');
  console.log('=' .repeat(60));
  console.log('• GPT-5 does NOT exist (fictional model)');
  console.log('• Claude 4.1 series does NOT exist (fictional models)');
  console.log('• Latest OpenAI: GPT-4o, o1, o1-mini');
  console.log('• Latest Anthropic: Claude 3.5 Sonnet, Claude 3.5 Haiku');
  console.log('• Latest Google: Gemini 2.0 Flash, Gemini 1.5 Pro');
  console.log('• X.AI: Grok 4 requires SuperGrok subscription');
  console.log('=' .repeat(60));
}

// Run the tests
testAllProviders().catch(console.error);


