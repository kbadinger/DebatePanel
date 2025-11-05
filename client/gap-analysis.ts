import { AVAILABLE_MODELS } from './lib/models/config.js';

// Models we have configured
const configured = new Set(AVAILABLE_MODELS.map(m => m.id));

// Key models discovered that we DON'T have
const missingImportant = {
  openai: [
    'gpt-5-pro',           // New GPT-5 Pro tier
    'o3-deep-research',    // Deep research variant
    'o4-mini-deep-research', // Deep research mini
    'gpt-5-codex',         // Coding specialist
  ],
  anthropic: [
    'claude-3-5-haiku-20241022', // Fast budget Claude 3.5
    'claude-3-haiku-20240307',   // Claude 3 Haiku
  ],
  google: [
    'gemini-2.0-pro-exp',           // Experimental Pro 2.0
    'gemini-2.0-flash-thinking-exp', // Thinking mode
    'gemini-2.5-flash-lite',        // Already in config but checking
  ],
  xai: [
    'grok-4-fast-reasoning',    // Fast reasoning variant
    'grok-4-fast-non-reasoning', // Fast non-reasoning
  ],
  mistral: [
    'mistral-large-latest',  // Latest large
    'mistral-small-latest',  // Latest small
  ],
  kimi: [
    'kimi-k2-preview',  // Newer K2
  ]
};

console.log('🔍 GAP ANALYSIS\n');
console.log('=' .repeat(80));
console.log('\n1️⃣  MODELS TO REMOVE (Outdated/Deprecated):\n');

// Check for old models that might be deprecated
const potentiallyOld = [
  'gpt-4o',  // Replaced by GPT-5
  'o1', 'o1-mini',  // Replaced by o3/o4
  'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-flash-8b', // Replaced by 2.x
  'grok-2', 'grok-2-1212',  // Replaced by Grok 3/4
  'claude-3-opus-20240229',  // Old Claude 3
  'claude-3-5-sonnet-20240620', // Old Claude 3.5
  'llama-3.3-70b', 'llama-3.1-405b',  // Replaced by Llama 4
  'deepseek-chat', 'deepseek-reasoner', // Replaced by v3.1
];

potentiallyOld.forEach(id => {
  if (configured.has(id)) {
    console.log(`   ⚠️  ${id} - Consider moving to secondary tier or removing`);
  }
});

console.log('\n2️⃣  HIGH-PRIORITY MISSING MODELS (Direct Integration Available):\n');

Object.entries(missingImportant).forEach(([provider, models]) => {
  console.log(`\n   ${provider.toUpperCase()}:`);
  models.forEach(m => {
    if (!configured.has(m)) {
      console.log(`   ❌ ${m}`);
    }
  });
});

console.log('\n\n3️⃣  MODELS NEEDING DIRECT INTEGRATION ASAP:\n');

// High-value models currently via OpenRouter that should have direct integration
const needDirectIntegration = [
  { model: 'llama-4-maverick', provider: 'meta', reason: 'In config, using OpenRouter - free tier available' },
  { model: 'mistral-medium-2505', provider: 'mistral', reason: 'In config, using OpenRouter - major provider' },
  { model: 'kimi-k2-preview', provider: 'kimi', reason: 'Not in config - excellent coding model' },
];

needDirectIntegration.forEach(({ model, provider, reason }) => {
  console.log(`   🚨 ${model} (${provider})`);
  console.log(`      → ${reason}\n`);
});

console.log('=' .repeat(80));
