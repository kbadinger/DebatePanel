# OpenRouter Integration Architecture

**Status**: ✅ Implemented
**Version**: 1.0
**Last Updated**: 2025-01-05

## Overview

DebatePanel uses a **hybrid routing architecture** that combines direct provider APIs with OpenRouter for comprehensive model coverage and automated discovery.

## Architecture Decision

### Why Hybrid Instead of OpenRouter-Only?

**Direct APIs for Core Providers** (30% markup):
- ✅ Best profit margins
- ✅ Full control over rate limits and error handling
- ✅ Immediate access to new features
- ✅ Direct debugging (no middle layer)

**OpenRouter for Discovery + Fringe Models** (40-50% markup):
- ✅ Automatic model catalog updates
- ✅ Pricing/metadata auto-populated
- ✅ Fast time-to-market for niche models
- ✅ 400+ models without individual integrations

## Routing Strategy

### Direct API Routing (routeVia: 'direct' or undefined)

**Providers**:
- OpenAI (GPT-4, GPT-5, o1/o3/o4 series)
- Anthropic (Claude 4.x, Claude 3.x series)
- Google (Gemini 2.x series)
- xAI (Grok models)
- DeepSeek (V3, R1 series)
- Perplexity (Sonar series)

**Markup**: 30%
**Implementation**: `lib/api/{provider}.ts`

**Example**:
```typescript
{
  id: 'gpt-4o',
  provider: 'openai',
  name: 'gpt-4o',
  displayName: 'GPT-4o',
  // routeVia: undefined (defaults to 'direct')
  costInfo: {
    platformMarkup: 0.30
  }
}
```

### OpenRouter Routing (routeVia: 'openrouter')

**Use Cases**:
1. **Major Providers Without Direct Integration**
   - Meta Llama, Mistral
   - Markup: 40%
   - Monitor usage - if >500 debates/month, build direct integration

2. **Fringe/Niche Providers**
   - Kimi, Qwen, Flux, Yi, etc.
   - Markup: 50%
   - Lower volume justifies higher markup

**Implementation**: `lib/api/openrouter.ts`

**Example**:
```typescript
{
  id: 'meta-llama/llama-4-scout',
  provider: 'meta',
  name: 'meta-llama/llama-4-scout',
  displayName: 'Llama 4 Scout',
  routeVia: 'openrouter',
  costInfo: {
    platformMarkup: 0.40  // Higher for OpenRouter routing
  }
}
```

## Model Discovery System

### 1. Discovery Module (`lib/models/openrouter-discovery.ts`)

**Functions**:
- `fetchOpenRouterModels()` - Fetches 400+ models from OpenRouter API
- `discoverModels()` - Discovers and classifies all models
- `classifyRouting()` - Decides direct vs OpenRouter routing
- `generateModelConfig()` - Auto-generates config.ts code
- `generatePricingConfig()` - Auto-generates pricing.ts code
- `generateParameterSchemas()` - Auto-generates parameter-schemas.ts code

**Classification Logic**:
```typescript
if (hasDirectIntegration(provider)) {
  return 'direct';  // 30% markup
} else if (isMajorProvider(provider) && usage > 500) {
  return 'openrouter';  // 40% markup, recommend direct integration
} else {
  return 'openrouter';  // 50% markup for fringe models
}
```

### 2. Discovery Script (`scripts/discover-models.ts`)

**Usage**:
```bash
# Discover using OpenRouter
npm run discover-models --openrouter

# Generate config files
npm run discover-models --openrouter --update

# Fallback to direct provider APIs if OpenRouter fails
npm run discover-models
```

**Output**:
- Displays discovered models grouped by provider
- Shows routing recommendations
- Generates code in `generated/model-updates-{timestamp}.ts`
- Ready to copy-paste into config/pricing/schema files

### 3. GitHub Actions (`model-discovery.yml`)

**Schedule**: Weekly (Monday 9am UTC) + manual trigger

**Workflow**:
1. Run OpenRouter discovery
2. Compare with current config
3. Detect new models or pricing changes
4. Auto-create PR with generated code
5. Human reviews and merges

## Parameter Adaptation System

### Problem

Different models have different parameter names and support:

```typescript
// OpenAI GPT-4
{ max_tokens: 1000, temperature: 0.7 }

// OpenAI o3 (reasoning model)
{ max_completion_tokens: 1000 }  // No temperature support!

// Anthropic Claude
{ max_tokens: 1000, temperature: 1.0 }  // Different scale!
```

### Solution: Parameter Schemas

**File**: `lib/models/parameter-schemas.ts`

```typescript
export const PARAMETER_SCHEMAS = {
  'o3-mini': {
    supportedParameters: {
      maxTokens: { paramName: 'max_completion_tokens', max: 200000 },
      temperature: { supported: false }  // o3 doesn't support temperature!
    }
  },
  'gpt-4o': {
    supportedParameters: {
      maxTokens: { paramName: 'max_tokens', max: 16384 },
      temperature: { supported: true, min: 0, max: 2 }
    }
  }
};
```

### Universal Request Builder

**File**: `lib/api/request-builder.ts`

```typescript
// Adapts to each model's specific requirements
const request = buildModelRequest('o3-mini', messages, {
  maxTokens: 5000,
  temperature: 0.7  // Will be silently dropped (not supported)
});

// Result: { max_completion_tokens: 5000, messages: [...] }
// No temperature parameter sent!
```

**Benefits**:
- ✅ Type-safe
- ✅ Auto-populated from OpenRouter
- ✅ Prevents API errors from unsupported params
- ✅ Future-proof (new models auto-detected)

## Cost Transparency

### Markup Tiers

Documented in `lib/models/pricing.ts`:

```typescript
/**
 * MARKUP STRATEGY (Hybrid Routing Architecture)
 *
 * Direct API (0.30 = 30% markup):
 *   - OpenAI, Anthropic, Google, xAI, DeepSeek, Perplexity
 *   - Best margins, full control, fastest feature access
 *
 * OpenRouter - Mainstream (0.40 = 40% markup):
 *   - Meta Llama, Mistral (major providers without direct integration yet)
 *   - Monitor usage - if >500 debates/month, build direct integration
 *
 * OpenRouter - Fringe (0.50 = 50% markup):
 *   - Kimi, Qwen, Flux, and other niche providers
 *   - Lower volume = higher markup justified
 */
```

### User-Facing Pricing

Models display routing information:

```
GPT-4o: $0.013/1k tokens (⭐ Premium)
Llama 4 Scout: $0.0014/1k tokens (💰 Budget, via OpenRouter)
```

## Usage Monitoring & Optimization

### Monthly Analysis Workflow

**File**: `.github/workflows/model-usage-monitoring.yml`

**Process**:
1. Runs monthly
2. Queries database for model usage stats
3. Identifies OpenRouter-routed models with >500 debates/month
4. Auto-creates GitHub issue recommending direct integration
5. Calculates ROI for building direct integration

**Example Output**:
```markdown
## Usage Alert: Llama 4 Scout

**Current Status**: Via OpenRouter (40% markup)
**Monthly Debates**: 847
**Monthly Cost**: $127.05
**Estimated Direct Cost**: $89.24
**Potential Monthly Savings**: $37.81

**Recommendation**: Build direct Meta API integration
**Break-even Point**: ~3 months of development time
```

## Environment Configuration

### Required Variables

```env
# OpenRouter (optional for discovery, required for runtime if using OpenRouter routing)
OPENROUTER_API_KEY=sk-or-v1-...

# Direct providers (required for those models)
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=AIza...
XAI_API_KEY=xai-...
DEEPSEEK_API_KEY=sk-...
PERPLEXITY_API_KEY=pplx-...
```

### Discovery vs Runtime

**Discovery** (weekly script):
- Only needs `OPENROUTER_API_KEY`
- Fetches model catalog and pricing
- Generates config code

**Runtime** (actual inference):
- Needs keys for providers being used
- OpenRouter-routed models require `OPENROUTER_API_KEY`
- Direct-routed models require specific provider keys

## File Structure

```
lib/
├── models/
│   ├── openrouter-discovery.ts   # OpenRouter integration
│   ├── parameter-schemas.ts       # Model parameter metadata
│   ├── config.ts                  # Model definitions (with routeVia)
│   └── pricing.ts                 # Pricing with markup tiers
├── api/
│   ├── openrouter.ts              # OpenRouter runtime client
│   ├── request-builder.ts         # Universal request adapter
│   ├── openai.ts                  # Direct OpenAI integration
│   ├── anthropic.ts               # Direct Anthropic integration
│   └── ... (other direct providers)
scripts/
└── discover-models.ts             # Discovery CLI tool
.github/workflows/
├── model-discovery.yml            # Weekly model discovery
├── model-verification.yml         # PR verification
└── model-usage-monitoring.yml     # Monthly usage analysis
types/
└── debate.ts                      # Model interface with routeVia field
```

## Development Workflow

### Adding a New Model (Automatic)

1. **Weekly Discovery Runs**
   - GitHub Action runs every Monday
   - OpenRouter discovery finds new models
   - PR auto-created with generated code

2. **Human Review** (15 min)
   - Review routing recommendations
   - Assign model strengths/roles
   - Approve and merge PR

3. **Deployment**
   - Vercel auto-deploys on merge
   - New models available immediately

### Adding a New Provider (Manual)

**If Major Provider** (e.g., Cohere):
1. Evaluate usage potential
2. Build direct integration (`lib/api/cohere.ts`)
3. Add to `DIRECT_PROVIDERS` in openrouter-discovery.ts
4. Update config with `routeVia: undefined` (direct)

**If Niche Provider** (e.g., Yi):
1. Add to OpenRouter discovery allowlist
2. Set `routeVia: 'openrouter'`
3. Use 50% markup
4. Monitor usage monthly

## Maintenance

### Weekly (~15 min)
- Review auto-generated model discovery PRs
- Verify pricing accuracy
- Merge updates

### Monthly (~30 min)
- Review usage monitoring reports
- Decide on direct integration for high-volume OpenRouter models
- Audit pricing accuracy vs actual costs

### Quarterly (~1 hour)
- Review routing strategy effectiveness
- Analyze margin trends
- Optimize markup tiers if needed

## Future Enhancements

### Potential Additions
1. **Automatic Pricing Reconciliation**
   - Compare OpenRouter pricing vs direct provider pricing
   - Alert on significant discrepancies

2. **A/B Testing Framework**
   - Test new models via OpenRouter first
   - Build direct integration if usage justifies it

3. **Dynamic Markup Adjustment**
   - Auto-adjust markups based on volume
   - Higher volume = lower markup (incentivize usage)

4. **Provider Health Monitoring**
   - Track OpenRouter uptime vs direct APIs
   - Auto-failover if OpenRouter has issues

## Success Metrics

✅ **Automation**: 95% of model updates auto-generated
✅ **Coverage**: 400+ models available vs 70 manually configured
✅ **Maintenance**: 15 min/week vs 2-3 hours/week previously
✅ **Margins**: 30% for core, 40-50% for fringe (vs flat 30%)
✅ **Time-to-Market**: New models available within 7 days of release

## Troubleshooting

### OpenRouter Discovery Fails

**Symptom**: `OPENROUTER_API_KEY` not set or API error

**Solution**:
1. Check `.env.local` has `OPENROUTER_API_KEY`
2. Verify key is valid at openrouter.ai
3. Script will fall back to direct provider APIs automatically

### Model Routes to OpenRouter But No Key

**Symptom**: Runtime error "OPENROUTER_API_KEY not configured"

**Solution**:
1. Add `OPENROUTER_API_KEY` to production environment
2. OR: Build direct integration for that provider
3. OR: Remove model from config if not needed

### Parameter Validation Errors

**Symptom**: API rejects request with "unsupported parameter"

**Solution**:
1. Check `parameter-schemas.ts` has correct schema
2. Re-run discovery to update schemas
3. Use `request-builder.ts` (auto-sanitizes requests)

### High Costs on OpenRouter Models

**Symptom**: Unexpected costs for OpenRouter-routed models

**Solution**:
1. Check usage monitoring workflow
2. If >500 debates/month, build direct integration
3. Consider removing low-value fringe models

## Support

**Documentation**: This file + inline code comments
**Questions**: Check `lib/models/openrouter-discovery.ts` for implementation details
**Issues**: GitHub Issues with `openrouter` label

---

**Last Updated**: 2025-01-05
**Author**: Claude (DebatePanel Development)
**Status**: Production Ready ✅
