#!/usr/bin/env tsx

/**
 * Model Discovery Script
 *
 * This script discovers all available models from AI providers and can update
 * our configuration files automatically.
 *
 * Uses OpenRouter as primary discovery source for comprehensive model catalog.
 *
 * Usage:
 * npm run discover-models          # Discover and show results
 * npm run discover-models --update # Discover and update config files
 * npm run discover-models --test   # Test specific models
 * npm run discover-models --openrouter # Use OpenRouter only
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { modelDiscovery, DiscoveredModel, ModelDiscoveryResult } from '../lib/models/discovery.js';
import {
  discoverModels as discoverOpenRouterModels,
  generateModelConfig,
  generatePricingConfig,
  generateParameterSchemas,
  DiscoveryResult as OpenRouterDiscoveryResult
} from '../lib/models/openrouter-discovery.js';

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
  const useOpenRouterOnly = args.includes('--openrouter');

  console.log('🔍 Discovering available AI models from all providers...\n');

  try {
    let results: ModelDiscoveryResult[];
    let openRouterResult: OpenRouterDiscoveryResult | null = null;

    // Try OpenRouter first for comprehensive discovery
    if (useOpenRouterOnly || process.env.OPENROUTER_API_KEY) {
      console.log('🌐 Using OpenRouter for model discovery...\n');
      openRouterResult = await discoverOpenRouterModels();

      if (openRouterResult.error) {
        console.error(`❌ OpenRouter discovery failed: ${openRouterResult.error}`);
        if (useOpenRouterOnly) {
          process.exit(1);
        }
        console.log('⚠️  Falling back to direct provider APIs...\n');
      } else {
        console.log(`✅ OpenRouter discovery successful: ${openRouterResult.stats.total} models found`);
        console.log(`   • ${openRouterResult.stats.direct} with direct integration`);
        console.log(`   • ${openRouterResult.stats.openrouter} via OpenRouter routing`);
        if (openRouterResult.stats.newProviders.length > 0) {
          console.log(`   • 🆕 New providers: ${openRouterResult.stats.newProviders.join(', ')}`);
        }
        console.log('');

        if (useOpenRouterOnly) {
          // Display OpenRouter results and exit
          displayOpenRouterResults(openRouterResult);
          if (shouldUpdate) {
            await updateConfigFilesFromOpenRouter(openRouterResult);
          }
          return;
        }
      }
    }

    // Clear cache for fresh discovery
    modelDiscovery.clearCache();

    // Discover all models from direct APIs
    results = await modelDiscovery.discoverAllModels();
    
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
  // TODO: Implement automatic config file updates for direct provider discovery
  // This would update config.ts, pricing.ts, etc. based on discovered models

  console.log('⚠️  Automatic config updates not yet fully implemented for direct providers.');
  console.log('💡 Use --openrouter flag for automatic config generation from OpenRouter.');
  console.log('Please manually update the following files based on discovery results:');
  console.log('  • lib/models/config.ts');
  console.log('  • lib/models/pricing.ts');
  console.log('  • lib/models/parameter-schemas.ts');
}

function displayOpenRouterResults(result: OpenRouterDiscoveryResult) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 OPENROUTER DISCOVERY RESULTS');
  console.log('='.repeat(80));

  // Group by provider
  const byProvider = new Map<string, typeof result.models>();
  for (const model of result.models) {
    if (!byProvider.has(model.provider)) {
      byProvider.set(model.provider, []);
    }
    byProvider.get(model.provider)!.push(model);
  }

  // Display by provider
  for (const [provider, models] of byProvider) {
    console.log(`\n🏢 ${provider.toUpperCase()}`);
    console.log('-'.repeat(40));
    console.log(`Found ${models.length} models`);

    const directModels = models.filter(m => m.routing.recommended === 'direct');
    const openrouterModels = models.filter(m => m.routing.recommended === 'openrouter');

    if (directModels.length > 0) {
      console.log(`  ✅ ${directModels.length} with direct integration`);
    }
    if (openrouterModels.length > 0) {
      console.log(`  🌐 ${openrouterModels.length} via OpenRouter routing`);
    }

    // Show sample models
    const sample = models.slice(0, 5);
    for (const model of sample) {
      const routeIcon = model.routing.recommended === 'direct' ? '✅' : '🌐';
      const price = `$${model.pricing.input.toFixed(4)}/1k`;
      console.log(`  ${routeIcon} ${model.id} - ${price}`);
    }

    if (models.length > 5) {
      console.log(`  ... and ${models.length - 5} more`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📈 SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total models: ${result.stats.total}`);
  console.log(`Direct routing: ${result.stats.direct}`);
  console.log(`OpenRouter routing: ${result.stats.openrouter}`);
  console.log(`Providers: ${byProvider.size}`);
  if (result.stats.newProviders.length > 0) {
    console.log(`New providers detected: ${result.stats.newProviders.join(', ')}`);
  }
}

async function updateConfigFilesFromOpenRouter(result: OpenRouterDiscoveryResult) {
  console.log('\n🔄 GENERATING CONFIGURATION CODE...\n');

  // Filter to only new/updated models (you'd compare with existing config here)
  const modelsToAdd = result.models.filter(m =>
    m.routing.recommended === 'direct' || m.routing.recommended === 'openrouter'
  );

  if (modelsToAdd.length === 0) {
    console.log('⚠️  No new models to add.');
    return;
  }

  // Generate code
  const configCode = generateModelConfig(modelsToAdd);
  const pricingCode = generatePricingConfig(modelsToAdd);
  const schemaCode = generateParameterSchemas(modelsToAdd);

  // Write to output file
  const outputDir = path.join(__dirname, '../generated');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = path.join(outputDir, `model-updates-${timestamp}.ts`);

  const output = `/**
 * Auto-generated Model Configuration
 * Generated: ${new Date().toISOString()}
 * Source: OpenRouter Discovery
 * Models: ${modelsToAdd.length}
 */

// ============================================================================
// MODELS FOR config.ts
// ============================================================================
// Add these to FEATURED_MODELS, EXPANDABLE_MODELS, or SECONDARY_MODELS:

${configCode}

// ============================================================================
// PRICING FOR pricing.ts
// ============================================================================
// Add these to MODEL_PRICING:

${pricingCode}

// ============================================================================
// PARAMETER SCHEMAS FOR parameter-schemas.ts
// ============================================================================
// Add these to PARAMETER_SCHEMAS:

${schemaCode}

// ============================================================================
// ROUTING SUMMARY
// ============================================================================
/*
Direct API (${modelsToAdd.filter(m => m.routing.recommended === 'direct').length} models):
${modelsToAdd
  .filter(m => m.routing.recommended === 'direct')
  .map(m => `  • ${m.id}`)
  .join('\n')}

OpenRouter Routing (${modelsToAdd.filter(m => m.routing.recommended === 'openrouter').length} models):
${modelsToAdd
  .filter(m => m.routing.recommended === 'openrouter')
  .map(m => `  • ${m.id} - ${m.routing.reasoning}`)
  .join('\n')}
*/
`;

  fs.writeFileSync(outputFile, output, 'utf8');

  console.log(`✅ Configuration code generated: ${outputFile}`);
  console.log('\n📋 Next steps:');
  console.log('1. Review the generated code');
  console.log('2. Copy relevant sections to:');
  console.log('   • lib/models/config.ts');
  console.log('   • lib/models/pricing.ts');
  console.log('   • lib/models/parameter-schemas.ts');
  console.log('3. Test the changes locally');
  console.log('4. Commit and push\n');
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