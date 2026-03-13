#!/usr/bin/env node

/**
 * Test a single model to verify it's working
 * 
 * Usage:
 *   npm run test-model -- gpt-5
 *   npm run test-model -- claude-3-5-sonnet-20241022
 */

import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import fs from 'fs';
import path from 'path';

// Load model registry
const registryPath = path.join(__dirname, '../lib/models/model-registry.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));

// Custom providers
const xai = require('@ai-sdk/openai').createOpenAI({
  baseURL: 'https://api.x.ai/v1',
  apiKey: process.env.XAI_API_KEY,
});

const perplexity = require('@ai-sdk/openai').createOpenAI({
  baseURL: 'https://api.perplexity.ai',
  apiKey: process.env.PERPLEXITY_API_KEY,
});

const deepseek = require('@ai-sdk/openai').createOpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

async function testModel(modelId: string) {
  console.log(`\n🧪 Testing model: ${modelId}\n`);
  
  // Find model in registry
  let modelInfo: any = null;
  let provider: string = '';
  
  for (const [providerName, providerData] of Object.entries(registry.providers)) {
    const model = (providerData as any).models.find((m: any) => m.id === modelId);
    if (model) {
      modelInfo = model;
      provider = providerName;
      break;
    }
  }
  
  if (!modelInfo) {
    console.error(`❌ Model ${modelId} not found in registry`);
    console.log('\nAvailable models:');
    for (const [providerName, providerData] of Object.entries(registry.providers)) {
      console.log(`\n${providerName}:`);
      (providerData as any).models.forEach((m: any) => {
        console.log(`  - ${m.id} (${m.displayName})`);
      });
    }
    process.exit(1);
  }
  
  console.log(`📦 Provider: ${provider}`);
  console.log(`🏷️  Display Name: ${modelInfo.displayName}`);
  console.log(`🔧 API Name: ${modelInfo.apiName}`);
  console.log(`📊 Category: ${modelInfo.category}`);
  console.log(`✅ Verified: ${modelInfo.verified}`);
  
  // Get the appropriate SDK
  let sdk: any;
  switch (provider) {
    case 'openai':
      sdk = openai;
      break;
    case 'anthropic':
      sdk = anthropic;
      break;
    case 'google':
      sdk = google;
      break;
    case 'xai':
      sdk = xai;
      break;
    case 'perplexity':
      sdk = perplexity;
      break;
    case 'deepseek':
      sdk = deepseek;
      break;
    default:
      console.error(`❌ Provider ${provider} not supported in test script`);
      process.exit(1);
  }
  
  // Test the model
  console.log(`\n🚀 Sending test prompt...`);
  
  try {
    const startTime = Date.now();
    
    const result = await generateText({
      model: sdk(modelInfo.apiName),
      prompt: 'Say "Hello! I am working correctly." and nothing else.',
      maxTokens: 50,
    });
    
    const duration = Date.now() - startTime;
    
    console.log(`\n✅ Success! Response received in ${duration}ms`);
    console.log(`📝 Response: ${result.text}`);
    console.log(`💰 Tokens used: ${result.usage?.totalTokens || 'N/A'}`);
    
    // Update registry to mark as verified
    if (!modelInfo.verified) {
      console.log(`\n🔄 Marking model as verified in registry...`);
      modelInfo.verified = true;
      fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2) + '\n');
      console.log(`✅ Model marked as verified!`);
    }
    
    console.log(`\n🎉 Model ${modelId} is working correctly!`);
    
  } catch (error: any) {
    console.error(`\n❌ Error testing model:`);
    console.error(`   ${error.message}`);
    
    if (error.message.includes('API key')) {
      console.log(`\n💡 Make sure ${provider.toUpperCase()}_API_KEY is set in your .env file`);
    } else if (error.message.includes('model')) {
      console.log(`\n💡 The model name might be incorrect. Check the provider's documentation.`);
    } else if (error.message.includes('rate')) {
      console.log(`\n💡 You might be rate limited. Try again in a few moments.`);
    }
    
    process.exit(1);
  }
}

// Get model ID from command line
const modelId = process.argv[2];

if (!modelId) {
  console.error('❌ Please provide a model ID');
  console.log('\nUsage:');
  console.log('  npm run test-model -- <model-id>');
  console.log('\nExample:');
  console.log('  npm run test-model -- gpt-5');
  console.log('  npm run test-model -- claude-3-5-sonnet-20241022');
  process.exit(1);
}

// Load environment variables
require('dotenv').config();

// Run the test
testModel(modelId).catch(console.error);
