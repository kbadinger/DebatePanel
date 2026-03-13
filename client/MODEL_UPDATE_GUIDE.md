# Model Update Guide

## Overview
This guide documents the routine process for updating AI models in the Debate Panel application. Follow these procedures to ensure new models are properly integrated and existing models remain functional.

## Quick Update Process

### 1. Check for New Models
Run the discovery script to check what models are available from each provider:

```bash
# Fetch all available models from providers
npm run fetch-models

# Or check specific providers
node scripts/test-all-providers.ts
```

### 2. Update Model Registry
The primary source of truth for available models is `/lib/models/model-registry.json`.

#### Manual Update Process
1. Open `/lib/models/model-registry.json`
2. Add new models to the appropriate provider section
3. Follow this structure:

```json
{
  "id": "model-id",           // Internal identifier
  "apiName": "model-api-name", // Actual API model name
  "displayName": "Display Name",
  "category": "flagship|premium|standard|budget|reasoning",
  "deprecated": false,
  "releaseDate": "YYYY-MM",
  "verified": true,            // Set to false initially, true after testing
  "notes": "Optional notes about the model"
}
```

#### Categories Explained:
- **flagship**: Latest, most capable models (e.g., GPT-5, Claude 3.5 Opus)
- **premium**: High-performance models (e.g., GPT-4, Gemini Pro)
- **standard**: Balanced performance/cost (e.g., GPT-5-mini)
- **budget**: Cost-efficient models (e.g., GPT-5-nano, Claude Haiku)
- **reasoning**: Specialized reasoning models (e.g., o1, DeepSeek R1)

### 3. Test New Models
Before marking as verified, test each new model:

```bash
# Test specific model
node scripts/test-anthropic-latest.ts
node scripts/test-gemini.ts
node scripts/test-grok-4.ts

# Or create a test debate
curl -X POST http://localhost:3000/api/debate \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Test topic",
    "models": [{"id": "new-model-id", "provider": "provider-name"}],
    "rounds": 1
  }'
```

### 4. Update Pricing (if needed)
Update `/lib/models/pricing.ts` with new model costs:

```typescript
export const MODEL_COSTS = {
  'model-id': {
    input: 0.00X,  // Cost per 1K input tokens
    output: 0.0X   // Cost per 1K output tokens
  }
}
```

### 5. Commit and Deploy

```bash
# Stage changes
git add lib/models/model-registry.json lib/models/pricing.ts

# Commit with descriptive message
git commit -m "Add [Provider] [Model Names] to model registry"

# Push to trigger deployment
git push origin main
```

## Automated Update Script

Create this script at `/scripts/update-models.ts`:

```typescript
import fs from 'fs';
import path from 'path';

async function updateModels() {
  const registryPath = path.join(__dirname, '../lib/models/model-registry.json');
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
  
  // Check each provider
  const providers = ['openai', 'anthropic', 'google', 'xai', 'perplexity'];
  
  for (const provider of providers) {
    console.log(`Checking ${provider}...`);
    
    try {
      // Provider-specific API calls to list models
      const models = await fetchProviderModels(provider);
      
      // Compare with existing registry
      const newModels = models.filter(m => 
        !registry.providers[provider].models.some(existing => 
          existing.apiName === m.id
        )
      );
      
      if (newModels.length > 0) {
        console.log(`Found ${newModels.length} new models for ${provider}:`, newModels);
        // Add to registry (requires manual review)
      }
    } catch (error) {
      console.error(`Error checking ${provider}:`, error);
    }
  }
}

async function fetchProviderModels(provider: string) {
  // Provider-specific implementation
  switch(provider) {
    case 'openai':
      // Use OpenAI API to list models
      break;
    case 'anthropic':
      // Anthropic doesn't have a list endpoint, maintain manually
      break;
    // ... other providers
  }
}
```

## Model Discovery Sources

### OpenAI
- API Endpoint: `GET https://api.openai.com/v1/models`
- Documentation: https://platform.openai.com/docs/models
- Announcements: https://openai.com/blog

### Anthropic
- No API endpoint for models
- Check: https://docs.anthropic.com/claude/docs/models-overview
- Announcements: https://www.anthropic.com/news

### Google (Gemini)
- API Endpoint: `GET https://generativelanguage.googleapis.com/v1/models`
- Documentation: https://ai.google.dev/models/gemini
- Announcements: https://blog.google/technology/ai/

### X.AI (Grok)
- Check: https://docs.x.ai/
- Twitter/X announcements: @xai

### Perplexity
- Documentation: https://docs.perplexity.ai/
- Blog: https://blog.perplexity.ai/

## Troubleshooting

### Model Not Working After Update

1. **Check API Key**: Ensure the provider's API key is set in Vercel environment variables
2. **Verify Model Name**: The `apiName` must match exactly what the provider expects
3. **Check Provider Status**: Some models require special access or subscriptions
4. **Review Logs**: Check Vercel function logs for specific error messages

### Common Issues

| Issue | Solution |
|-------|----------|
| "Model not found" | Verify `apiName` matches provider's exact model ID |
| "Unauthorized" | Check API key is set and has access to the model |
| "Rate limited" | Some new models have different rate limits |
| "Invalid request" | Model might require different parameters |

## Maintenance Schedule

### Daily
- Monitor Vercel logs for model-related errors
- Check provider status pages for outages

### Weekly
- Run model discovery scripts
- Check provider blogs/docs for new models
- Test random selection of models

### Monthly
- Full model registry audit
- Update deprecated models
- Review and update pricing
- Performance benchmarking

## Environment Variables

Ensure these are set in Vercel dashboard:

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...
XAI_API_KEY=xai-...
PERPLEXITY_API_KEY=pplx-...
DEEPSEEK_API_KEY=...
MISTRAL_API_KEY=...
```

## Model Registry Structure

```
/lib/models/
├── model-registry.json    # Source of truth for available models
├── discovered-models.json  # Auto-discovered models (reference)
├── providers.ts           # Provider SDK configurations
├── provider-config.ts     # API key mappings
├── pricing.ts            # Token costs per model
├── config.ts             # Model configurations
└── orchestrator.ts       # Debate orchestration logic
```

## Best Practices

1. **Always Test First**: Never mark a model as `verified: true` without testing
2. **Preserve Backwards Compatibility**: Don't remove models, mark as deprecated
3. **Document Changes**: Include notes field for special requirements
4. **Monitor Costs**: Update pricing.ts when costs change
5. **Version Control**: Always commit model updates with clear messages
6. **Gradual Rollout**: Test new models in development before production

## Emergency Rollback

If a model update breaks production:

```bash
# Revert last commit
git revert HEAD
git push origin main

# Or revert to specific commit
git checkout <last-working-commit> -- lib/models/model-registry.json
git commit -m "Revert model registry to working state"
git push origin main
```

## Contact for Issues

- GitHub Issues: [your-repo]/issues
- Vercel Support: For deployment issues
- Provider Support: For model-specific issues

---

Last Updated: January 2025
Maintained by: Debate Panel Team
