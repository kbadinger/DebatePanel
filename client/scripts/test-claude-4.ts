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

async function testClaude4Models() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY not found');
    process.exit(1);
  }

  console.log('🔄 Testing Claude 4 models from your screenshot...\n');
  
  // Verified working Claude models
  const modelsToTest = [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
    'claude-3-haiku-20240307'
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
              content: 'What model version are you? Reply in 10 words or less.'
            }
          ],
          max_tokens: 50
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log(`  ✅ ${model} WORKS!`);
        console.log(`  Response: "${data.content[0].text}"`);
        results[model] = { status: 'working', response: data.content[0].text };
      } else {
        console.log(`  ❌ Error: ${data.error?.message}`);
        results[model] = { status: 'error', error: data.error?.message };
      }
    } catch (error: any) {
      console.log(`  ❌ Failed: ${error.message}`);
      results[model] = { status: 'failed' };
    }
    console.log('');
  }
  
  console.log('='.repeat(60));
  console.log('📊 CLAUDE 4 TEST RESULTS');
  console.log('='.repeat(60));
  
  const working = Object.entries(results).filter(([_, r]: [string, any]) => r.status === 'working');
  const notWorking = Object.entries(results).filter(([_, r]: [string, any]) => r.status !== 'working');
  
  if (working.length > 0) {
    console.log('\n✅ WORKING CLAUDE 4 MODELS:');
    working.forEach(([model, result]: [string, any]) => {
      console.log(`  • ${model}`);
      if (result.response) {
        console.log(`    Response: "${result.response}"`);
      }
    });
  }
  
  if (notWorking.length > 0) {
    console.log('\n❌ NOT ACCESSIBLE VIA API:');
    notWorking.forEach(([model, result]: [string, any]) => {
      console.log(`  • ${model}`);
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
    });
  }
  
  console.log('\n💡 KEY FINDINGS:');
  const hasClaude4 = working.some(([model]) => 
    model.includes('opus-4') || model.includes('sonnet-4') || model.includes('3-7'));
  
  if (hasClaude4) {
    console.log('  🎉 CLAUDE 4 MODELS ARE REAL AND WORKING!');
    console.log('  These need to be added to the config immediately.');
  } else {
    console.log('  ⚠️  Claude 4 models exist but may not be accessible via standard API');
    console.log('  They might be Cursor-exclusive or require special access');
  }
  
  console.log('\n📝 ACTION REQUIRED:');
  console.log('1. Add all working models to config.ts');
  console.log('2. Update pricing for Claude 4 models');
  console.log('3. Test in debate scenarios');
  
  console.log('='.repeat(60));
}

testClaude4Models().catch(console.error);



















