# Remove Invalid Grok 4.2 Model — March 1, 2026

## Problem
`grok-4-2` model ID was added based on a naming convention guess when Elon announced it. It does not exist in the xAI API, causing errors when selected. The 4.1 models (`grok-4-1-fast-reasoning`, `grok-4-1-fast-non-reasoning`) are already in the config as secondary models.

## Plan

### 1. `lib/models/config.ts` — MODEL_CONTEXT_LIMITS
- [x] Remove `'grok-4-2': 256000` entry

### 2. `lib/models/config.ts` — MODEL_ROLES
- [x] Remove `'grok-4-2'` role entry

### 3. `lib/models/config.ts` — LIVE_SEARCH_MODELS
- [x] Remove `'grok-4-2'` from the set

### 4. `lib/models/config.ts` — FEATURED_MODELS
- [x] Remove the `grok-4-2` withModelInfo block

### 5. `lib/models/pricing.ts` — MODEL_PRICING
- [x] Remove `'grok-4-2'` pricing entry

## Review

### Changes Made
- **2 files changed**, 0 lines added, 17 lines removed
- Removed all references to non-existent `grok-4-2` model ID from config and pricing
- Grok 4.1 models (`grok-4-1-fast-reasoning`, `grok-4-1-fast-non-reasoning`) remain available as secondary models
- No new code introduced — pure removal of invalid entries
