# Model Management Guide

## Overview

This guide explains how to manage AI models in the Debate Panel application. The system uses a centralized model registry to track available models across providers and ensure the configuration stays up-to-date.

## Architecture

```
lib/models/
├── model-registry.json   # Central registry of all available models
├── config.ts             # Active model configuration
├── pricing.ts            # Model pricing information
└── providers.ts          # Provider implementations

scripts/
├── manage-models.ts      # Model management utility
├── fetch-models.js       # OpenAI model fetcher
└── fetch-all-models.js   # Multi-provider fetcher
```

## Model Registry

The `model-registry.json` file serves as the single source of truth for available models:

- **lastUpdated**: Timestamp of last registry update
- **providers**: Configuration for each AI provider
- **models**: List of available models with metadata
  - `id`: Internal identifier
  - `apiName`: Name used in API calls
  - `displayName`: User-friendly name
  - `category`: Model tier (flagship/premium/standard/budget/reasoning)
  - `deprecated`: Whether the model is deprecated
  - `releaseDate`: Model release date
  - `verified`: Whether availability is verified via API
  - `notes`: Optional notes about the model

## Model Management Commands

### Check for Updates
```bash
npm run manage-models validate
```
This command:
- Checks for deprecated models in use
- Identifies new models available
- Reports configuration issues

### Fetch Latest Models
```bash
npm run manage-models update
```
This command:
- Fetches latest models from provider APIs (where available)
- Updates the model registry
- Preserves manually added models

### Generate Configuration
```bash
npm run manage-models generate
```
This command:
- Generates updated TypeScript configuration
- Sorts models by category
- Outputs code ready to paste into `config.ts`

### Full Sync
```bash
npm run manage-models sync
```
This command:
- Runs all operations (update, validate, generate)
- Complete workflow for updating models

## Adding New Models Manually

1. Edit `lib/models/model-registry.json`
2. Add the model to the appropriate provider section
3. Set `verified: false` for manually added models
4. Run `npm run manage-models generate` to get the config code

Example:
```json
{
  "id": "new-model-name",
  "apiName": "api-model-name",
  "displayName": "Display Name",
  "category": "standard",
  "deprecated": false,
  "releaseDate": "2025-01",
  "verified": false,
  "notes": "Description of the model"
}
```

## Updating Pricing

When adding new models, update pricing in `lib/models/pricing.ts`:

```typescript
'model-id': {
  modelId: 'model-id',
  costPer1kTokens: {
    input: 0.001,  // Cost per 1k input tokens
    output: 0.002  // Cost per 1k output tokens
  },
  costCategory: 'standard', // budget/standard/premium/luxury/flagship
  providerBaseCost: 0.003,  // Total provider cost per 1k
  platformMarkup: 0.3        // 30% markup
}
```

## Model Categories

- **flagship**: Most powerful, expensive models (🚀)
- **luxury**: Top-tier models with premium features (⚫)
- **premium**: High-performance models (🟣)
- **standard**: Balanced performance and cost (🔵)
- **budget**: Cost-effective models (🟢)
- **reasoning**: Specialized reasoning models

## Provider Configuration

Each provider needs API keys in `.env.local`:

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Google
GEMINI_API_KEY=...

# X.AI (Grok)
XAI_API_KEY=xai-...

# Perplexity
PERPLEXITY_API_KEY=pplx-...

# DeepSeek
DEEPSEEK_API_KEY=...

# Mistral
MISTRAL_API_KEY=...
```

## Workflow for Keeping Models Updated

### Weekly Check (Recommended)
1. Run `npm run manage-models sync`
2. Review the output for new/deprecated models
3. Update `config.ts` with generated configuration
4. Update `pricing.ts` with appropriate costs
5. Test new models in development
6. Deploy changes

### When Provider Announces New Models
1. Check provider documentation for model names
2. Add to `model-registry.json` manually
3. Run `npm run manage-models generate`
4. Update configuration files
5. Add pricing information

### Handling Deprecated Models
1. Keep deprecated models in config for backward compatibility
2. Mark as deprecated in registry
3. Add comments in config indicating deprecation
4. Plan migration for existing users
5. Remove after grace period

## Troubleshooting

### Models Not Fetching
- Check API keys are set correctly
- Verify provider API is accessible
- Check for rate limiting

### Validation Errors
- Run `npm run manage-models validate` to identify issues
- Check model IDs match between registry and config
- Ensure pricing exists for all models

### Generation Issues
- Ensure registry JSON is valid
- Check for duplicate model IDs
- Verify all required fields are present

## Best Practices

1. **Regular Updates**: Check for new models weekly
2. **Test Before Deploy**: Test new models in development first
3. **Document Changes**: Update changelog when adding/removing models
4. **Monitor Costs**: Review pricing changes from providers
5. **Backward Compatibility**: Keep deprecated models temporarily
6. **Version Control**: Commit registry changes with config updates

## Current Model Status (January 2025)

### Latest Models by Provider
- **OpenAI**: GPT-4o, o1, o1-mini
- **Anthropic**: Claude 3.5 Sonnet, Claude 3.5 Haiku
- **Google**: Gemini 2.0 Flash, Gemini 1.5 Pro
- **X.AI**: grok-beta, grok-2-1212 (standard API access)
- **DeepSeek**: V3 (chat), R1 (reasoner)
- **Mistral**: Large, Medium models
- **Perplexity**: Sonar models with online search

### Recently Deprecated
- OpenAI: GPT-5 series (fictional models removed)
- Anthropic: Claude 4.1 series (fictional models removed)

### Models Requiring Special Subscriptions
- X.AI: Grok 3, Grok 4, Grok 4 Heavy (require paid subscription tiers, not available via standard API)

## Support

For issues or questions about model management:
1. Check this documentation
2. Review error messages from the management script
3. Check provider documentation for API changes
4. File an issue if you encounter bugs
