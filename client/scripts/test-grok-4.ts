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

async function testGrok4() {
  const apiKey = process.env.XAI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ XAI_API_KEY not found in .env.local');
    process.exit(1);
  }

  console.log('🔄 Testing Grok 4 access with your SuperGrok subscription...\n');
  
  try {
    // Test with Grok 4
    console.log('Testing Grok 4...');
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'grok-4',
        messages: [
          {
            role: 'user',
            content: 'Say "Hello from Grok 4!" and tell me what day it is today.'
          }
        ],
        temperature: 0.7,
        max_tokens: 100
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Grok 4 is working!');
      console.log('Response:', data.choices[0].message.content);
      console.log('\n📊 Usage:', {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens
      });
    } else {
      console.error('❌ Grok 4 access failed:', data.error?.message || JSON.stringify(data));
      
      if (data.error?.message?.includes('model not found') || data.error?.message?.includes('invalid model')) {
        console.log('\n⚠️  Grok 4 requires a SuperGrok subscription ($30/month)');
        console.log('   Visit https://x.com/settings/premium to upgrade');
      }
    }
    
    // Test other models
    console.log('\n---\n\nTesting other available models...');
    
    // Try grok-2 since grok-beta might not exist
    const modelsToTest = ['grok-2', 'grok-2-1212', 'grok-beta'];
    let workingFallback = null;
    
    for (const model of modelsToTest) {
      console.log(`\nTrying ${model}...`);
      const testResponse = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'user',
              content: `Say "Hello from ${model}!"`
            }
          ],
          temperature: 0.7,
          max_tokens: 50
        })
      });
      
      const testData = await testResponse.json();
      
      if (testResponse.ok) {
        console.log(`✅ ${model} is working!`);
        console.log('Response:', testData.choices[0].message.content);
        workingFallback = model;
      } else {
        console.log(`❌ ${model} not available`);
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 Summary:');
    if (response.ok) {
      console.log('✅ You have SuperGrok access - Grok 4 is available!');
      console.log('   You can use Grok 4 in your debates now.');
      if (workingFallback) {
        console.log(`   Fallback model available: ${workingFallback}`);
      }
    } else if (workingFallback) {
      console.log('⚠️  You have standard API access only');
      console.log(`   Available model: ${workingFallback}`);
      console.log('   To access Grok 4, upgrade to SuperGrok at:');
      console.log('   https://x.com/settings/premium');
    } else {
      console.log('❌ No models accessible - please check your XAI_API_KEY');
    }
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error testing Grok:', error);
  }
}

// Run the test
testGrok4().catch(console.error);
