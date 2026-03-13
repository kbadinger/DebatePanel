#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ModelInfo {
  id: string;
  apiName: string;
  displayName: string;
  category: 'flagship' | 'premium' | 'standard' | 'budget' | 'reasoning' | 'legacy';
  deprecated: boolean;
  releaseDate: string;
  verified: boolean;
  notes?: string;
}

interface ProviderInfo {
  name: string;
  apiUrl: string;
  modelsEndpoint: string | null;
  requiresAuth: boolean;
  models: ModelInfo[];
}

interface ModelRegistry {
  lastUpdated: string;
  providers: Record<string, ProviderInfo>;
}

const REGISTRY_PATH = path.join(__dirname, '../lib/models/model-registry.json');
const CONFIG_PATH = path.join(__dirname, '../lib/models/config.ts');
const PRICING_PATH = path.join(__dirname, '../lib/models/pricing.ts');

// Load environment variables
function loadEnv(): Record<string, string> {
  const envPath = path.join(__dirname, '../.env.local');
  const env: Record<string, string> = {};
  
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    });
  }
  
  return { ...process.env, ...env };
}

const env = loadEnv();

// Fetch latest models from OpenAI
async function fetchOpenAIModels(): Promise<ModelInfo[]> {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log('⚠️  OPENAI_API_KEY not found - skipping OpenAI models');
    return [];
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    const models = data.data
      .filter((m: any) => {
        const id = m.id.toLowerCase();
        return (id.includes('gpt') || id.includes('o1') || id.includes('o3')) &&
               !id.includes('whisper') && !id.includes('embedding') && 
               !id.includes('tts') && !id.includes('dall-e');
      })
      .map((m: any) => ({
        id: m.id,
        apiName: m.id,
        displayName: m.id.toUpperCase().replace(/-/g, ' '),
        category: determineCategory(m.id),
        deprecated: false,
        releaseDate: new Date(m.created * 1000).toISOString().split('T')[0],
        verified: true
      }));

    return models;
  } catch (error) {
    console.error('❌ Error fetching OpenAI models:', error);
    return [];
  }
}

// Fetch Google Gemini models
async function fetchGoogleModels(): Promise<ModelInfo[]> {
  const apiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.log('⚠️  GEMINI_API_KEY not found - skipping Google models');
    return [];
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    const models = data.models
      ?.filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m: any) => ({
        id: m.name.replace('models/', ''),
        apiName: m.name.replace('models/', ''),
        displayName: m.displayName || m.name.replace('models/', ''),
        category: determineCategory(m.name),
        deprecated: false,
        releaseDate: new Date().toISOString().split('T')[0],
        verified: true
      })) || [];

    return models;
  } catch (error) {
    console.error('❌ Error fetching Google models:', error);
    return [];
  }
}

// Fetch Mistral models
async function fetchMistralModels(): Promise<ModelInfo[]> {
  const apiKey = env.MISTRAL_API_KEY;
  if (!apiKey) {
    console.log('⚠️  MISTRAL_API_KEY not found - skipping Mistral models');
    return [];
  }

  try {
    const response = await fetch('https://api.mistral.ai/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    const models = data.data?.map((m: any) => ({
      id: m.id,
      apiName: m.id,
      displayName: m.id.split('-').map((w: string) => 
        w.charAt(0).toUpperCase() + w.slice(1)
      ).join(' '),
      category: determineCategory(m.id),
      deprecated: false,
      releaseDate: new Date(m.created * 1000).toISOString().split('T')[0],
      verified: true
    })) || [];

    return models;
  } catch (error) {
    console.error('❌ Error fetching Mistral models:', error);
    return [];
  }
}

// Determine model category based on name
function determineCategory(modelName: string): ModelInfo['category'] {
  const name = modelName.toLowerCase();
  
  if (name.includes('o1') || name.includes('o3') || name.includes('reasoner')) {
    return 'reasoning';
  }
  if (name.includes('opus') || name.includes('pro') || name.includes('large') || name.includes('heavy')) {
    return 'premium';
  }
  if (name.includes('mini') || name.includes('flash') || name.includes('haiku') || name.includes('small')) {
    return 'budget';
  }
  if (name.includes('flagship') || name.includes('ultra')) {
    return 'flagship';
  }
  return 'standard';
}

// Update registry with fetched models
async function updateRegistry() {
  console.log('🔄 Updating model registry...\n');
  
  // Load existing registry
  const registry: ModelRegistry = JSON.parse(
    fs.readFileSync(REGISTRY_PATH, 'utf8')
  );

  // Fetch latest models from providers
  const updates = {
    openai: await fetchOpenAIModels(),
    google: await fetchGoogleModels(),
    mistral: await fetchMistralModels()
  };

  // Merge updates into registry
  for (const [provider, models] of Object.entries(updates)) {
    if (models.length > 0 && registry.providers[provider]) {
      console.log(`✅ Found ${models.length} ${provider} models`);
      
      // Keep manual entries and merge with fetched
      const manualModels = registry.providers[provider].models.filter(m => !m.verified);
      const fetchedIds = new Set(models.map(m => m.id));
      const uniqueManual = manualModels.filter(m => !fetchedIds.has(m.id));
      
      registry.providers[provider].models = [...models, ...uniqueManual];
    }
  }

  registry.lastUpdated = new Date().toISOString();
  
  // Save updated registry
  fs.writeFileSync(
    REGISTRY_PATH,
    JSON.stringify(registry, null, 2)
  );
  
  console.log('\n✅ Registry updated successfully!');
}

// Validate current config against registry
function validateConfig() {
  console.log('🔍 Validating current configuration...\n');
  
  const registry: ModelRegistry = JSON.parse(
    fs.readFileSync(REGISTRY_PATH, 'utf8')
  );
  
  const configContent = fs.readFileSync(CONFIG_PATH, 'utf8');
  const issues: string[] = [];
  
  // Check each provider
  for (const [providerId, provider] of Object.entries(registry.providers)) {
    for (const model of provider.models) {
      const regex = new RegExp(`id:\\s*['"]${model.id}['"]`);
      const inConfig = regex.test(configContent);
      
      if (model.deprecated && inConfig) {
        issues.push(`⚠️  Deprecated model in use: ${providerId}/${model.id}`);
      }
      
      if (!model.deprecated && !model.verified && !inConfig && model.category !== 'legacy') {
        // Check if model requires special subscription
        if (model.notes?.includes('special subscription') || model.notes?.includes('not available via standard API')) {
          // Don't suggest models that require special subscriptions
          continue;
        }
        issues.push(`📝 New model available: ${providerId}/${model.id} - ${model.displayName}`);
      }
    }
  }
  
  if (issues.length > 0) {
    console.log('Issues found:\n');
    issues.forEach(issue => console.log(issue));
  } else {
    console.log('✅ Configuration is up to date!');
  }
}

// Generate updated config file
function generateConfig() {
  console.log('📝 Generating updated configuration...\n');
  
  const registry: ModelRegistry = JSON.parse(
    fs.readFileSync(REGISTRY_PATH, 'utf8')
  );
  
  const models: string[] = [];
  
  for (const [providerId, provider] of Object.entries(registry.providers)) {
    const activeModels = provider.models
      .filter(m => !m.deprecated)
      .sort((a, b) => {
        const categoryOrder = ['flagship', 'premium', 'reasoning', 'standard', 'budget'];
        return categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
      });
    
    if (activeModels.length === 0) continue;
    
    models.push(`  // ${provider.name} Models`);
    
    for (const model of activeModels) {
      models.push(`  withCostInfo({
    id: '${model.id}',
    provider: '${providerId}',
    name: '${model.apiName}',
    displayName: '${model.displayName}'${model.notes ? `,
    // ${model.notes}` : ''}
  }),`);
    }
    models.push('');
  }
  
  console.log('Generated model configuration:\n');
  console.log('```typescript');
  console.log(models.join('\n'));
  console.log('```');
  
  console.log('\n💡 Copy the above configuration to lib/models/config.ts');
}

// Main command handler
async function main() {
  const command = process.argv[2];
  
  console.log('=' .repeat(60));
  console.log('🤖 Model Management Tool');
  console.log('=' .repeat(60) + '\n');
  
  switch (command) {
    case 'update':
      await updateRegistry();
      break;
    case 'validate':
      validateConfig();
      break;
    case 'generate':
      generateConfig();
      break;
    case 'sync':
      await updateRegistry();
      validateConfig();
      generateConfig();
      break;
    default:
      console.log('Usage: npm run manage-models <command>\n');
      console.log('Commands:');
      console.log('  update    - Fetch latest models from providers');
      console.log('  validate  - Check config for deprecated/missing models');
      console.log('  generate  - Generate updated model configuration');
      console.log('  sync      - Run all operations (update, validate, generate)');
  }
  
  console.log('\n' + '=' .repeat(60));
}

main().catch(console.error);
