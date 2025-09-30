#!/usr/bin/env tsx

/**
 * Full Model Scanner
 *
 * Complete workflow for discovering models:
 * 1. Queries all provider APIs
 * 2. Compares with current config
 * 3. Generates TypeScript code for new models
 * 4. Optionally updates config files
 *
 * Usage:
 *   npm run scan-models                 # Discovery report
 *   npm run scan-models --generate      # Generate config code
 *   npm run scan-models --verify        # Test API calls
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  discoverAllModels,
  compareWithConfig,
  generateConfigCode,
  type DiscoveredModel
} from '../lib/models/api-discovery.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
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

async function main() {
  const args = process.argv.slice(2);
  const shouldGenerate = args.includes('--generate');
  const shouldVerify = args.includes('--verify');

  console.log('🔍 Full Model Scanner - API-First Discovery');
  console.log('='.repeat(70));
  console.log('');

  // Step 1: Discover models from all providers
  console.log('📡 Querying provider APIs...\n');
  const results = await discoverAllModels();

  // Step 2: Display discovery results
  let totalModels = 0;
  let totalVerified = 0;
  let totalErrors = 0;

  for (const result of results) {
    const providerName = result.provider.toUpperCase().padEnd(12);
    const modelCount = result.models.length;
    const verifiedCount = result.models.filter(m => m.verified).length;
    const errorCount = result.models.filter(m => !m.verified).length;

    totalModels += modelCount;
    totalVerified += verifiedCount;
    totalErrors += errorCount;

    if (result.error) {
      console.log(`❌ ${providerName} Error: ${result.error}`);
      continue;
    }

    if (modelCount === 0) {
      console.log(`⚠️  ${providerName} No models found`);
      continue;
    }

    console.log(`✅ ${providerName} ${modelCount} models (${verifiedCount} verified)`);

    // Show model details if requested
    if (shouldVerify) {
      for (const model of result.models) {
        const status = model.verified ? '✅' : '❌';
        const error = model.error ? ` - ${model.error}` : '';
        console.log(`   ${status} ${model.id}${error}`);
      }
      console.log('');
    }
  }

  console.log('');
  console.log('─'.repeat(70));
  console.log(`📊 Total: ${totalModels} models | ✅ ${totalVerified} verified | ❌ ${totalErrors} errors`);
  console.log('─'.repeat(70));
  console.log('');

  // Step 3: Compare with current configuration
  console.log('🔍 Comparing with current configuration...\n');
  const configModelIds = await getCurrentConfigModels();
  const comparison = compareWithConfig(results, configModelIds);

  console.log(`📋 Current config: ${configModelIds.length} models`);
  console.log(`🆕 New models found: ${comparison.new.length}`);
  console.log(`⚠️  Missing from API: ${comparison.missing.length}`);
  console.log(`✅ Matched: ${comparison.matched.length}`);
  console.log('');

  // Step 4: Show new models
  if (comparison.new.length > 0) {
    console.log('🆕 NEW MODELS DISCOVERED:');
    console.log('─'.repeat(70));

    for (const model of comparison.new) {
      console.log(`   ${model.provider.padEnd(12)} ${model.id}`);
      console.log(`   ${' '.repeat(12)} → ${model.displayName}`);
    }
    console.log('');
  }

  // Step 5: Show deprecated models (need retirement)
  if (comparison.deprecated && comparison.deprecated.length > 0) {
    console.log('🗑️  DEPRECATED MODELS (SHOULD BE RETIRED):');
    console.log('─'.repeat(70));

    for (const model of comparison.deprecated) {
      console.log(`   ❌ ${model.id}`);
      console.log(`   ${' '.repeat(12)} Not found in provider API - likely deprecated`);
    }
    console.log('');
    console.log('⚠️  ACTION REQUIRED: Remove these models from config');
    console.log('   Or mark as deprecated with a comment');
    console.log('');
  }

  // Step 6: Show missing models (in config but not discovered)
  if (comparison.missing.length > 0) {
    const nonDeprecated = comparison.missing.filter(
      m => !comparison.deprecated?.some(d => d.id === m.id)
    );

    if (nonDeprecated.length > 0) {
      console.log('⚠️  MODELS IN CONFIG BUT NOT FOUND IN API:');
      console.log('─'.repeat(70));

      for (const model of nonDeprecated) {
        console.log(`   ${model.id}`);
        console.log(`   ${' '.repeat(12)} (May require special access or not yet in API)`);
      }
      console.log('');
    }
  }

  // Step 6: Generate configuration code if requested
  if (shouldGenerate && comparison.new.length > 0) {
    console.log('📝 GENERATED CONFIGURATION CODE:');
    console.log('='.repeat(70));
    console.log('');

    const code = generateConfigCode(comparison.new);
    console.log(code);
    console.log('');
    console.log('='.repeat(70));
    console.log('');

    // Save to file
    const outputPath = path.join(__dirname, '../model-updates.ts');
    fs.writeFileSync(outputPath, code);
    console.log(`✅ Configuration code saved to: ${outputPath}`);
    console.log('');
  }

  // Step 7: Summary and next steps
  console.log('🎯 NEXT STEPS:');
  console.log('─'.repeat(70));

  if (comparison.new.length > 0) {
    console.log('1. Review new models above');
    console.log('2. Copy generated code to lib/models/config.ts');
    console.log('3. Add pricing to lib/models/pricing.ts');
    console.log('4. Add roles/strengths to MODEL_ROLES in config.ts');
    console.log('5. Add context limits to MODEL_CONTEXT_LIMITS');
    console.log('6. Test new models in development');
  } else {
    console.log('✅ No new models found - configuration is up to date!');
  }

  if (comparison.missing.length > 0) {
    console.log('');
    console.log('⚠️  Review models marked as missing - they may be deprecated');
  }

  console.log('');
  console.log('💡 TIP: Run with --generate to create ready-to-paste code');
  console.log('💡 TIP: Run with --verify to see detailed model verification');
  console.log('');
}

/**
 * Extract model IDs from current config
 */
async function getCurrentConfigModels(): Promise<string[]> {
  try {
    const configPath = path.join(__dirname, '../lib/models/config.ts');
    const configContent = fs.readFileSync(configPath, 'utf8');

    const modelIds: string[] = [];

    // Extract IDs from withModelInfo calls
    const regex = /id:\s*['"]([^'"]+)['"]/g;
    let match;

    while ((match = regex.exec(configContent)) !== null) {
      if (match[1] && !modelIds.includes(match[1])) {
        modelIds.push(match[1]);
      }
    }

    return modelIds;
  } catch (error) {
    console.warn('Could not read current config:', error);
    return [];
  }
}

// Run the scanner
main().catch(error => {
  console.error('❌ Scanner failed:', error);
  process.exit(1);
});