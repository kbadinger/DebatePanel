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

async function testAnthropicModels() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY not found');
    process.exit(1);
  }

  console.log('🔄 Testing Anthropic models with correct naming...\n');
  
  // The error message suggested "claude-3-5-sonnet" instead of "claude-3.5-sonnet"
  const modelsToTest = [
    // Try with hyphens instead of dots
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-5-opus-20241022',
    
    // Original dot notation
    'claude-3.5-sonnet-20241022',
    'claude-3.5-haiku-20241022',
    
    // Claude 3 models (known working)
    'claude-3-opus-20240229',
    'claude-3-haiku-20240307',
    'claude-3-sonnet-20240229',
    
    // Latest aliases
    'claude-3-opus-latest',
    'claude-3-haiku-latest',
    'claude-3-sonnet-latest',
    
    // Try Claude 4 variations with hyphens
    'claude-4-1-opus',
    'claude-4-1-sonnet',
    'claude-4-1-haiku',
    'claude-4-opus',
    'claude-4-sonnet'
  ];
  
  const results: any = {};
  
  for (const model of modelsToTest) {
    console.log(`Testing ${model}...`);
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
          messages: [
            {
              role: 'user',
              content: 'What is your model name and version? Be specific.'
            }
          ],
          max_tokens: 100
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log(`  ✅ ${model} WORKS!`);
        console.log(`  Response: "${data.content[0].text}"`);
        results[model] = 'working';
      } else {
        console.log(`  ❌ Error: ${data.error?.message}`);
        results[model] = 'not_found';
      }
    } catch (error: any) {
      console.log(`  ❌ Failed: ${error.message}`);
      results[model] = 'failed';
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(60));
  
  const working = Object.entries(results).filter(([_, status]) => status === 'working');
  const notWorking = Object.entries(results).filter(([_, status]) => status !== 'working');
  
  if (working.length > 0) {
    console.log('\n✅ WORKING ANTHROPIC MODELS:');
    working.forEach(([model]) => console.log(`  • ${model}`));
  }
  
  if (notWorking.length > 0) {
    console.log('\n❌ NOT FOUND:');
    notWorking.forEach(([model]) => console.log(`  • ${model}`));
  }
  
  console.log('\n💡 TRUTH ABOUT ANTHROPIC:');
  const has35 = working.some(([model]) => model.includes('3-5'));
  const has4 = working.some(([model]) => model.includes('4'));
  
  if (has35) {
    console.log('  ✅ Claude 3.5 models exist (use hyphens not dots!)');
  }
  if (has4) {
    console.log('  ✅ Claude 4 models exist!');
  } else {
    console.log('  ❌ Claude 4/4.1 models do NOT exist yet');
  }
  
  console.log('\n📝 CONFIG UPDATE:');
  console.log('Use these exact model names in config.ts:');
  working.forEach(([model]) => {
    console.log(`  "${model}"`);
  });
  
  console.log('='.repeat(60));
}

testAnthropicModels().catch(console.error);








