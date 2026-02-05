# Task: Add Claude Opus 4.6 + Reasoning Effort Support

## Plan

### 1. Add Claude Opus 4.6
- [x] **config.ts** — Add context limit, model role, featured entry for Opus 4.6; demote Opus 4.5 to expandable
- [x] **pricing.ts** — Add pricing entry for `claude-opus-4-6`
- [x] **orchestrator.ts** — Update Anthropic fallback chain to include Opus 4.6

### 2. Add Global Reasoning Effort Setting
- [x] **types/debate.ts** — Add `ReasoningEffort` type and `reasoningEffort?` field to `DebateConfig`
- [x] **config.ts** — Add `REASONING_EFFORT_MODELS` set of reasoning-capable model IDs
- [x] **orchestrator.ts** — For reasoning-capable models, pass `reasoningEffort` via SDK model settings
- [x] **app/page.tsx** — Add reasoning effort dropdown (only visible when reasoning models selected)

## Review

### Changes Made

**Claude Opus 4.6** (3 files):
- `config.ts`: Added `claude-opus-4-6` to context limits (200k), model roles (flagship), and featured models. Demoted Opus 4.5 to expandable section.
- `pricing.ts`: Added pricing entry ($15/$75 per 1M tokens, flagship tier, 30% markup) — same as Opus 4.5.
- `orchestrator.ts`: Added fallback chain: Opus 4.6 -> Opus 4.5 -> Sonnet 4.5. Also added Opus 4.5 -> Sonnet 4.5 -> 3.5 Sonnet.

**Reasoning Effort** (4 files):
- `types/debate.ts`: Added `ReasoningEffort = 'low' | 'medium' | 'high'` type and optional field on `DebateConfig`.
- `config.ts`: Added `REASONING_EFFORT_MODELS` set containing all models that support the parameter (OpenAI o-series, xAI grok-3-mini + reasoning variants, DeepSeek R1/reasoner).
- `orchestrator.ts`: For OpenAI, xAI, and DeepSeek providers, conditionally passes `{ reasoningEffort }` as the 2nd argument to the SDK provider function when the model is in the set and config has the setting.
- `app/page.tsx`: Added a `<select>` dropdown with low/medium/high options. Only renders when at least one reasoning-capable model is selected. Shows which selected models it applies to.

### How it works
- The `@ai-sdk/openai` SDK (used by OpenAI, xAI, DeepSeek) accepts `reasoningEffort` as a model setting: `openai('o3-mini', { reasoningEffort: 'high' })`. This maps to the `reasoning_effort` API parameter.
- The dropdown defaults to "medium" and only appears when relevant models are in the panel.
- No changes needed for non-reasoning models — they ignore the setting entirely.

### TypeScript verification
- All modified files compile clean. Pre-existing errors in `admin/subscriptions/page.tsx` are unrelated.
