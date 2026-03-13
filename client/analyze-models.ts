import { AVAILABLE_MODELS } from './lib/models/config.js';

// Get all model IDs from config
const configuredModels = new Set(AVAILABLE_MODELS.map(m => m.id));

console.log('📊 CONFIGURED MODELS ANALYSIS\n');
console.log('Total models in config:', configuredModels.size);
console.log('\nConfigured models:');
AVAILABLE_MODELS.forEach(m => {
  console.log(`  - ${m.id} (${m.provider})`);
});
