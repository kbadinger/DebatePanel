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

async function testGeminiModels() {
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  
  if (!apiKey) {
    console.error('❌ GOOGLE_AI_API_KEY not found in .env.local');
    process.exit(1);
  }

  console.log('🔄 Testing Google Gemini models...\n');
  
  try {
    // First, discover available models
    console.log('📋 Discovering available Gemini models...');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    const availableModels = data.models
      ?.filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m: any) => ({
        name: m.name.replace('models/', ''),
        displayName: m.displayName,
        description: m.description
      })) || [];
    
    console.log(`Found ${availableModels.length} available models:\n`);
    availableModels.forEach((m: any) => {
      console.log(`  • ${m.name}`);
      if (m.displayName !== m.name) {
        console.log(`    Display: ${m.displayName}`);
      }
    });
    
    // Test specific models we're interested in
    const modelsToTest = [
      'gemini-2.0-flash-exp',
      'gemini-2.0-flash',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-pro',
      'gemini-pro-vision',
      // Also test any that were discovered
      ...availableModels.map((m: any) => m.name).slice(0, 10)
    ];
    
    // Remove duplicates
    const uniqueModels = [...new Set(modelsToTest)];
    
    console.log('\n🧪 Testing model functionality...\n');
    
    const results: any = {};
    
    for (const model of uniqueModels) {
      console.log(`Testing ${model}...`);
      try {
        const testResponse = await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: 'What model are you? Reply in 10 words or less.'
              }]
            }],
            generationConfig: {
              maxOutputTokens: 50,
              temperature: 0.7
            }
          })
        });

        const testData = await testResponse.json();
        
        if (testResponse.ok && testData.candidates?.[0]?.content?.parts?.[0]?.text) {
          console.log(`  ✅ ${model} WORKS!`);
          console.log(`  Response: "${testData.candidates[0].content.parts[0].text}"`);
          results[model] = { status: 'working', response: testData.candidates[0].content.parts[0].text };
        } else {
          console.log(`  ❌ Error: ${testData.error?.message || 'No response'}`);
          results[model] = { status: 'error', error: testData.error?.message };
        }
      } catch (error: any) {
        console.log(`  ❌ Failed: ${error.message}`);
        results[model] = { status: 'failed' };
      }
      console.log('');
    }
    
    console.log('='.repeat(60));
    console.log('📊 GEMINI MODEL RESULTS');
    console.log('='.repeat(60));
    
    const working = Object.entries(results).filter(([_, r]: [string, any]) => r.status === 'working');
    const notWorking = Object.entries(results).filter(([_, r]: [string, any]) => r.status !== 'working');
    
    if (working.length > 0) {
      console.log('\n✅ WORKING GEMINI MODELS:');
      working.forEach(([model, result]: [string, any]) => {
        console.log(`  • ${model}`);
        if (result.response) {
          console.log(`    Response: "${result.response}"`);
        }
      });
    }
    
    if (notWorking.length > 0) {
      console.log('\n❌ NOT WORKING:');
      notWorking.forEach(([model, result]: [string, any]) => {
        console.log(`  • ${model}`);
        if (result.error) {
          console.log(`    Error: ${result.error}`);
        }
      });
    }
    
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('Add these working models to config.ts:');
    working.forEach(([model]) => {
      console.log(`  "${model}"`);
    });
    
    console.log('='.repeat(60));
    
  } catch (error: any) {
    console.error('❌ Error testing Gemini models:', error.message);
  }
}

testGeminiModels().catch(console.error);
