# Add GPT-5.4 Models — March 5, 2026

## Problem
GPT-5.4 launched today (March 5, 2026) with standard and Pro variants. Need to add to DebatePanel.

## Specs
- `gpt-5.4`: $2.50/1M input, $15.00/1M output, 272K context (1M opt-in)
- `gpt-5.4-pro`: $30/1M input, $180/1M output, extended reasoning

## Plan

### 1. `lib/models/config.ts` — MODEL_CONTEXT_LIMITS
- [x] Add `gpt-5.4` (272000) and `gpt-5.4-pro` (272000)

### 2. `lib/models/config.ts` — MODEL_ROLES
- [x] Add strengths and role descriptions for both models

### 3. `lib/models/config.ts` — MODEL_PERFORMANCE_CHARACTERISTICS
- [x] Add `gpt-5.4-pro` as slow thinking model

### 4. `lib/models/config.ts` — FEATURED_MODELS
- [x] Add `gpt-5.4` and `gpt-5.4-pro` as featured
- [x] Move `gpt-5.2` series from FEATURED to EXPANDABLE

### 5. `lib/models/pricing.ts` — MODEL_PRICING
- [x] Add pricing entries for both models

### 6. `lib/models/config.ts` — REASONING_EFFORT_MODELS
- [x] Add `gpt-5.4-pro` (supports reasoning effort levels)

### 7. `lib/models/model-registry.json`
- [x] Add registry entries for both models

## Review

### Changes Made
- **3 files changed**: `config.ts`, `pricing.ts`, `model-registry.json`
- Added `gpt-5.4` and `gpt-5.4-pro` across all model configuration surfaces
- GPT-5.4 featured as primary OpenAI models, GPT-5.2 series demoted to expandable
- GPT-5.4 Pro marked as slow thinking + reasoning effort model
- Pricing: $2.50/$15 (standard), $30/$180 (Pro) per 1M tokens
- Context: 272K default for both (1M opt-in available)
