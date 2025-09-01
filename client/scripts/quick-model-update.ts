#!/usr/bin/env node

/**
 * Quick Model Update Script
 * 
 * Usage:
 *   npm run update-model -- --provider openai --id gpt-5 --name "GPT-5" --category flagship
 *   npm run update-model -- --provider google --id gemini-3-pro --name "Gemini 3 Pro" --category premium
 */

import fs from 'fs';
import path from 'path';
import { parseArgs } from 'util';

const registryPath = path.join(__dirname, '../lib/models/model-registry.json');

interface ModelUpdate {
  provider: string;
  id: string;
  name: string;
  category: 'flagship' | 'premium' | 'standard' | 'budget' | 'reasoning';
  apiName?: string;
  notes?: string;
}

function updateModelRegistry(update: ModelUpdate) {
  // Read current registry
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
  
  // Check if provider exists
  if (!registry.providers[update.provider]) {
    console.error(`Provider ${update.provider} not found in registry`);
    process.exit(1);
  }
  
  // Check if model already exists
  const existingIndex = registry.providers[update.provider].models.findIndex(
    (m: any) => m.id === update.id
  );
  
  const newModel = {
    id: update.id,
    apiName: update.apiName || update.id,
    displayName: update.name,
    category: update.category,
    deprecated: false,
    releaseDate: new Date().toISOString().slice(0, 7), // YYYY-MM format
    verified: false,
    notes: update.notes || `Added via quick-update script`
  };
  
  if (existingIndex >= 0) {
    // Update existing model
    console.log(`Updating existing model: ${update.id}`);
    registry.providers[update.provider].models[existingIndex] = {
      ...registry.providers[update.provider].models[existingIndex],
      ...newModel
    };
  } else {
    // Add new model
    console.log(`Adding new model: ${update.id}`);
    registry.providers[update.provider].models.push(newModel);
  }
  
  // Update last updated timestamp
  registry.lastUpdated = new Date().toISOString();
  
  // Write back to file
  fs.writeFileSync(
    registryPath,
    JSON.stringify(registry, null, 2) + '\n'
  );
  
  console.log(`✅ Model registry updated successfully!`);
  console.log(`📝 Added/Updated: ${update.provider}/${update.id}`);
  console.log(`\nNext steps:`);
  console.log(`1. Test the model: npm run test-model -- ${update.id}`);
  console.log(`2. If working, update verified to true in model-registry.json`);
  console.log(`3. Commit and push: git add -A && git commit -m "Add ${update.name}" && git push`);
}

// Parse command line arguments
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    provider: { type: 'string' },
    id: { type: 'string' },
    name: { type: 'string' },
    category: { type: 'string' },
    apiName: { type: 'string' },
    notes: { type: 'string' },
    help: { type: 'boolean', short: 'h' }
  }
});

if (values.help) {
  console.log(`
Quick Model Update Script

Usage:
  npm run update-model -- --provider <provider> --id <model-id> --name <display-name> --category <category>

Required Arguments:
  --provider   Provider name (openai, anthropic, google, xai, perplexity, deepseek, mistral)
  --id         Model ID (e.g., gpt-5, claude-4)
  --name       Display name (e.g., "GPT-5", "Claude 4")
  --category   Category (flagship, premium, standard, budget, reasoning)

Optional Arguments:
  --apiName    API model name if different from ID
  --notes      Additional notes about the model
  --help, -h   Show this help message

Examples:
  npm run update-model -- --provider openai --id gpt-5 --name "GPT-5" --category flagship
  npm run update-model -- --provider anthropic --id claude-4 --name "Claude 4" --category premium --notes "Latest Claude model"
  `);
  process.exit(0);
}

// Validate required arguments
if (!values.provider || !values.id || !values.name || !values.category) {
  console.error('❌ Missing required arguments. Use --help for usage information.');
  process.exit(1);
}

// Validate category
const validCategories = ['flagship', 'premium', 'standard', 'budget', 'reasoning'];
if (!validCategories.includes(values.category)) {
  console.error(`❌ Invalid category. Must be one of: ${validCategories.join(', ')}`);
  process.exit(1);
}

// Run the update
updateModelRegistry({
  provider: values.provider,
  id: values.id,
  name: values.name,
  category: values.category as ModelUpdate['category'],
  apiName: values.apiName,
  notes: values.notes
});
