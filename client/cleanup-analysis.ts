import { AVAILABLE_MODELS } from './lib/models/config.js';

console.log('🧹 CLEANUP ANALYSIS\n');
console.log('='.repeat(80));

// Models that are definitely outdated
const outdatedModels = [
  'gpt-4o',
  'gpt-4o-mini',
  'claude-3-5-sonnet-20240620',
];

const configured = AVAILABLE_MODELS.map(m => m.id);

console.log('\n📋 MODELS IN EXPANDABLE THAT SHOULD STAY:\n');

outdatedModels.forEach(id => {
  if (configured.includes(id)) {
    console.log('   - ' + id);
  }
});

console.log('\n🔍 PROVIDER COUNT:\n');

const providerUsage: Record<string, number> = {};

AVAILABLE_MODELS.forEach(m => {
  providerUsage[m.provider] = (providerUsage[m.provider] || 0) + 1;
});

Object.entries(providerUsage).sort((a, b) => b[1] - a[1]).forEach(([provider, count]) => {
  console.log(provider + ': ' + count + ' models');
});

console.log('\n💡 PROVIDERS WITH MODELS BUT NO DIRECT INTEGRATION:\n');

const needsCheck = ['qwen', 'flux', 'cohere', 'ai21'];
needsCheck.forEach(p => {
  if (providerUsage[p]) {
    console.log('   ⚠️  ' + p.toUpperCase() + ': ' + providerUsage[p] + ' models');
  }
});

console.log('\n='.repeat(80));
