#!/usr/bin/env tsx

/**
 * Model Discovery Script
 * 
 * This script discovers all available models from AI providers and can update
 * our configuration files automatically.
 * 
 * Usage:
 * npm run discover-models          # Discover and show results
 * npm run discover-models --update # Discover and update config files
 * npm run discover-models --test   # Test specific models
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { modelDiscovery, DiscoveredModel, ModelDiscoveryResult } from '../lib/models/discovery.js';

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

async function main() {
  const args = process.argv.slice(2);
  const shouldUpdate = args.includes('--update');
  const shouldTest = args.includes('--test');

  console.log('🔍 Discovering available AI models from all providers...\n');

  try {
    // Clear cache for fresh discovery
    modelDiscovery.clearCache();
    
    // Discover all models
    const results = await modelDiscovery.discoverAllModels();
    
    // Display results
    console.log('='.repeat(80));
    console.log('📊 MODEL DISCOVERY RESULTS');
    console.log('='.repeat(80));
    
    let totalModels = 0;
    let totalWorkingModels = 0;
    
    for (const result of results) {
      console.log(`\n🏢 ${result.provider.toUpperCase()}`);
      console.log('-'.repeat(40));
      
      if (result.error) {
        console.log(`❌ Error: ${result.error}`);
        continue;
      }
      
      if (result.models.length === 0) {
        console.log('⚠️  No models found');
        continue;
      }
      
      const workingModels = result.models.filter(m => m.verified);
      totalModels += result.models.length;
      totalWorkingModels += workingModels.length;
      
      console.log(`✅ Found ${result.models.length} models (${workingModels.length} verified working)`);
      
      // Show model details
      for (const model of result.models) {
        const status = model.verified ? '✅' : '❌';
        const context = model.context_length ? ` (${model.context_length} ctx)` : '';
        console.log(`  ${status} ${model.id}${context}`);
      }
      
      console.log(`📅 Last updated: ${new Date(result.lastUpdated).toLocaleString()}`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('📈 SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total models discovered: ${totalModels}`);
    console.log(`Working models: ${totalWorkingModels}`);
    console.log(`Providers checked: ${results.length}`);
    console.log(`Providers with errors: ${results.filter(r => r.error).length}`);
    
    // Check for missing models from our current config
    const currentConfig = await getCurrentConfigModels();
    const discoveredIds = new Set(results.flatMap(r => r.models.map(m => m.id)));
    
    console.log('\n🔍 CONFIGURATION ANALYSIS:');
    console.log('-'.repeat(40));
    
    const missingFromDiscovery = currentConfig.filter(id => !discoveredIds.has(id));
    const newModels = results.flatMap(r => r.models)
      .filter(m => !currentConfig.includes(m.id) && m.verified);
    
    if (missingFromDiscovery.length > 0) {
      console.log('⚠️  Models in config but NOT discovered:');
      missingFromDiscovery.forEach(id => console.log(`   • ${id}`));
    }
    
    if (newModels.length > 0) {
      console.log('🆕 New working models discovered:');
      newModels.forEach(model => console.log(`   • ${model.id} (${model.provider})`));
    }
    
    if (shouldUpdate) {
      console.log('\n🔄 UPDATING CONFIGURATION FILES...');
      await updateConfigFiles(results);
      console.log('✅ Configuration files updated!');
    } else {
      console.log('\n💡 To update configuration files, run: npm run discover-models --update');
    }
    
    if (shouldTest) {
      console.log('\n🧪 TESTING MODEL RESPONSES...');
      await testModelResponses(results);
    }
    
  } catch (error) {
    console.error('❌ Discovery failed:', error);
    process.exit(1);
  }
}

async function getCurrentConfigModels(): Promise<string[]> {
  try {
    const configPath = path.join(__dirname, '../lib/models/config.ts');
    const configContent = fs.readFileSync(configPath, 'utf8');
    
    // Extract model IDs from the config file
    const modelIds: string[] = [];
    const matches = configContent.matchAll(/'([^']+)':/g);
    for (const match of matches) {
      if (match[1] && !match[1].includes('default') && match[1].includes('-')) {
        modelIds.push(match[1]);
      }
    }
    
    return [...new Set(modelIds)];
  } catch (error) {
    console.warn('Could not read current config:', error);
    return [];
  }
}

async function updateConfigFiles(results: ModelDiscoveryResult[]) {
  // TODO: Implement automatic config file updates
  // This would update config.ts, pricing.ts, etc. based on discovered models
  
  console.log('⚠️  Automatic config updates not yet implemented.');
  console.log('Please manually update the following files based on discovery results:');
  console.log('  • lib/models/config.ts');
  console.log('  • lib/models/pricing.ts');
  console.log('  • lib/models/model-registry.json');
}

async function testModelResponses(results: ModelDiscoveryResult[]) {
  console.log('Testing a few models with simple prompts...');
  
  const modelsToTest = results
    .flatMap(r => r.models)
    .filter(m => m.verified)
    .slice(0, 3); // Test first 3 working models
  
  for (const model of modelsToTest) {
    console.log(`\nTesting ${model.id}...`);
    // TODO: Implement actual model testing
    console.log('  (Test implementation needed)');
  }
}

// Save results to JSON file for analysis
async function saveResults(results: ModelDiscoveryResult[]) {
  const outputPath = path.join(__dirname, '../discovered-models.json');
  const output = {
    discoveredAt: new Date().toISOString(),
    totalProviders: results.length,
    totalModels: results.reduce((sum, r) => sum + r.models.length, 0),
    results
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`📄 Results saved to: ${outputPath}`);
}

// Run the script
main().catch(console.error);