# Model Update Task - January 29, 2026

## Summary
Update DebatePanel to include the latest AI models that are currently missing from the config.

## Models to Add

### High Priority (New Models)
- [x] **Grok 4.1 Fast Reasoning** (`grok-4-1-fast-reasoning`) - Nov 2025
- [x] **Grok 4.1 Fast Non-Reasoning** (`grok-4-1-fast-non-reasoning`) - Nov 2025
- [x] **Gemini 3 Flash** (`gemini-3-flash`) - Released Jan 29, 2026 (today!)
- [x] **Gemini 3 Deep Think** (`gemini-3-deep-think`) - Nov 2025, reasoning model
- [x] **DeepSeek V3.2** (`deepseek-v3.2`) - Latest DeepSeek

### Medium Priority
- [x] Verify Mistral naming is current (keeping existing aliases)

## Files Modified

1. **`/lib/models/config.ts`**:
   - `MODEL_CONTEXT_LIMITS` - added 5 new entries
   - `MODEL_ROLES` - added 5 new role definitions
   - `LIVE_SEARCH_MODELS` - added Grok 4.1 models
   - `MODEL_PERFORMANCE_CHARACTERISTICS` - added Gemini 3 Deep Think
   - `FEATURED_MODELS` - added Gemini 3 Flash
   - `EXPANDABLE_MODELS` - added Grok 4.1, Gemini 3 Deep Think, DeepSeek V3.2

2. **`/lib/models/pricing.ts`** - Added pricing for all 5 new models

---

## Review

### Changes Made

**Grok 4.1 Models (xAI)**
- Added `grok-4-1-fast-reasoning` and `grok-4-1-fast-non-reasoning`
- Context: 256K tokens (same as Grok 4 fast)
- Added to LIVE_SEARCH_MODELS (have real-time search)
- Placed in xai expandable (above older 4.0 fast variants)
- Pricing: Premium tier, 30% markup

**Gemini 3 Flash (Google)**
- Added to FEATURED_MODELS (fast flagship model)
- Context: 1M tokens
- Budget tier pricing (fast and efficient)
- Released today (Jan 29, 2026)

**Gemini 3 Deep Think (Google)**
- Added to google EXPANDABLE_MODELS
- Context: 1M tokens
- Added to MODEL_PERFORMANCE_CHARACTERISTICS (slow thinking, ~3 min/round)
- Premium tier pricing (reasoning model)

**DeepSeek V3.2**
- Added to deepseek EXPANDABLE_MODELS
- Context: 128K tokens
- Budget tier pricing (competitive DeepSeek rates)
- Outperforms GPT-5 on reasoning benchmarks

### No Breaking Changes
- Old models kept for backward compatibility
- Existing functionality unchanged
- Only additive changes made
