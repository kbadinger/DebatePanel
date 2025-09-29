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
    console.error('❌ ANTHROPIC_API_KEY not found in .env.local');
    process.exit(1);
  }

  console.log('🔄 Testing Anthropic models - checking for Claude 4.1 and other new models...\n');
  
  // Models to test - including potential new ones
  const modelsToTest = [
    // Claude 4.1 series (checking if they exist)
    'claude-4.1-opus',
    'claude-opus-4.1',
    'claude-4.1-sonnet', 
    'claude-sonnet-4.1',
    'claude-4.1-haiku',
    'claude-haiku-4.1',
    'claude-4.1',
    'claude-4-opus',
    'claude-4-sonnet',
    
    // Latest Claude 3.5 models
    'claude-3.5-sonnet-20241022',
    'claude-3.5-haiku-20241022',
    'claude-3.5-opus-20241022',
    
    // Claude 3 models
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
    
    // Check for any newer versions
    'claude-3.5-sonnet-latest',
    'claude-3.5-haiku-latest',
    'claude-3.5-opus-latest',
    'claude-3-opus-latest',
    'claude-3-sonnet-latest',
    'claude-3-haiku-latest',
    
    // Potential future models
    'claude-3.6-sonnet',
    'claude-3.7-sonnet',
    'claude-4-sonnet',
    'claude-latest',
    'claude-instant'
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
              content: 'What model are you? Reply with just your model name.'
            }
          ],
          max_tokens: 50
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log(`  ✅ ${model} is WORKING!`);
        console.log(`  Response: ${data.content[0].text}`);
        console.log(`  Usage: ${JSON.stringify(data.usage)}`);
        results[model] = { status: 'working', response: data.content[0].text };
      } else {
        if (data.error?.type === 'invalid_request_error' && 
            data.error?.message?.includes('model')) {
          console.log(`  ❌ ${model} not found`);
          results[model] = { status: 'not_found' };
        } else {
          console.log(`  ⚠️ ${model} error: ${data.error?.message}`);
          results[model] = { status: 'error', error: data.error?.message };
        }
      }
    } catch (error: any) {
      console.log(`  ❌ ${model} failed: ${error.message}`);
      results[model] = { status: 'failed' };
    }
    console.log('');
  }
  
  // Also try to discover models via a different approach
  console.log('🔍 Trying alternative discovery methods...\n');
  
  // Test with version dates for 2025
  const years = ['2024', '2025'];
  const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  const modelBases = ['claude-3.5-sonnet', 'claude-3.5-haiku', 'claude-3.5-opus', 'claude-4-sonnet', 'claude-4.1-opus'];
  
  console.log('Testing date-based model names...');
  for (const base of modelBases) {
    for (const year of years) {
      for (const month of months.slice(0, 3)) { // Test first 3 months
        const modelName = `${base}-${year}${month}22`;
        try {
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: modelName,
              messages: [{ role: 'user', content: 'Hi' }],
              max_tokens: 10
            })
          });
          
          if (response.ok) {
            console.log(`  🎉 FOUND NEW MODEL: ${modelName}`);
            results[modelName] = { status: 'working' };
          }
        } catch (error) {
          // Silent fail for discovery
        }
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 ANTHROPIC MODEL SUMMARY');
  console.log('='.repeat(60));
  
  const working = Object.entries(results).filter(([_, r]: [string, any]) => r.status === 'working');
  const notFound = Object.entries(results).filter(([_, r]: [string, any]) => r.status === 'not_found');
  
  if (working.length > 0) {
    console.log('\n✅ WORKING MODELS:');
    working.forEach(([model, result]: [string, any]) => {
      console.log(`  • ${model}`);
      if (result.response) {
        console.log(`    Model identifies as: "${result.response}"`);
      }
    });
  }
  
  if (notFound.length > 0) {
    console.log('\n❌ NOT FOUND (These models don\'t exist):');
    notFound.forEach(([model]) => console.log(`  • ${model}`));
  }
  
  console.log('\n💡 KEY FINDINGS:');
  const hasClause4 = working.some(([model]) => model.includes('4.1') || model.includes('claude-4'));
  
  if (hasClause4) {
    console.log('  🎉 Claude 4 or 4.1 models FOUND! Add them to config immediately.');
  } else {
    console.log('  ℹ️ No Claude 4 or 4.1 models found via API');
    console.log('  Latest available: Claude 3.5 Sonnet and Haiku (October 2024)');
  }
  
  console.log('\n🔧 RECOMMENDATIONS:');
  console.log('  1. Add all working models to config.ts');
  console.log('  2. Remove non-existent models (claude-4.1 series)');
  console.log('  3. Monitor Anthropic blog for actual Claude 4 release');
  
  console.log('='.repeat(60));
}

// Run the test
testAnthropicModels().catch(console.error);






















