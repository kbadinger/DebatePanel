# Debate Panel - Implementation Status

**Last Updated:** 2025-12-02 (Session 2)

## Current Goal
Build a world-class debate system with:
- 5 rounds default / 7 rounds for deep analysis
- Polling architecture (prevents timeouts)
- Reputation-based prompts (fixes yes-man behavior)

---

## Round Structure

### Standard Mode: 5 Rounds
| Round | Purpose |
|-------|---------|
| 1 | **Independent Analysis** - All options, genuine assessment, ranked recommendations |
| 2 | **First Challenges** - "You missed X", "Your reasoning is weak here" |
| 3 | **Defend + Counter** - Respond to challenges, concede valid points, counter-challenge |
| 4 | **Stress-Test Defenses** - Challenge the defenses, find remaining holes |
| 5 | **Final Positions** - What survived, final recommendations |
| End | **Synthesis** - What won, what got destroyed, who had key insights |

### Deep Analysis Mode: 7 Rounds
For high-stakes decisions (major pivots, architecture, policy).
- Adds: R5 Second Defense + New Angles, R6 Final Stress-Test
- R7 becomes Final Positions

---

## Implementation Phases

### Phase 1: Polling Infrastructure ✅ COMPLETE (2025-12-02)
Prevents timeouts by returning immediately and polling for updates.

| Task | Status | File |
|------|--------|------|
| Add status/currentRound to Prisma schema | ✅ Done | `/prisma/schema.prisma` |
| Create status polling endpoint | ✅ Done | `/app/api/debate/[id]/status/route.ts` |
| Refactor debate API to async | ✅ Done | `/app/api/debate/route.ts` |
| Update frontend to poll | ✅ Done | `/components/debate/DebateInterface.tsx` |

**Details of Changes:**

1. **`/app/api/debate/route.ts`** - Major refactor:
   - `executeDebateAsync(debateId, config, userId)` - Background function that runs the full debate
   - POST handler now returns immediately: `{ debateId, status: 'running', message: '...' }`
   - Removed all SSE streaming code (~400 lines)
   - Background function updates DB after each round completion
   - Handles judge analysis, winner selection, credit deduction in background

2. **`/app/api/debate/[id]/status/route.ts`** - Already existed, returns:
   ```json
   {
     "id": "...",
     "status": "running|completed|failed|converged",
     "currentRound": 3,
     "totalRounds": 5,
     "rounds": [...completed rounds with responses...],
     "finalSynthesis": "...",
     "judgeAnalysis": "...",
     "winner": { "id", "name", "type", "reason" }
   }
   ```

3. **`/components/debate/DebateInterface.tsx`** - Frontend polling:
   - Replaced SSE stream reading with polling loop
   - Polls `/api/debate/[id]/status` every 3 seconds
   - Updates UI state as rounds complete
   - Handles completed/failed/waiting-for-human states
   - 30-minute max polling timeout (600 attempts)

4. **Deleted** `/generated/model-updates-2025-11-12T20-01-05-018Z.ts` - Had 50+ syntax errors, wasn't imported

---

### Phase 2: New Prompts ✅ COMPLETE (2025-12-02)
Fixes yes-man behavior with round-specific prompts.

| Task | Status | File |
|------|--------|------|
| Round 1: Independent Analysis prompt | ✅ Done (existing) | `/lib/models/orchestrator.ts` |
| Round 2: Challenge prompt | ✅ Done | `/lib/models/orchestrator.ts` |
| Round 3: Defend/Counter prompt | ✅ Done | `/lib/models/orchestrator.ts` |
| Round 4: Stress-Test prompt | ✅ Done | `/lib/models/orchestrator.ts` |
| Round 5: Final Position prompt | ✅ Done | `/lib/models/orchestrator.ts` |
| Deep Analysis R5-R7 prompts | ✅ Done | `/lib/models/orchestrator.ts` |

**Details of Changes:**

Added to `/lib/models/orchestrator.ts`:

1. **`buildRound2ChallengePrompt()`** - Forces models to challenge Round 1 positions
   - "Your ONLY job this round is to challenge"
   - Attack reasoning, find edge cases, demand evidence

2. **`buildRound3DefendPrompt()`** - Defend positions and counter-attack
   - Acknowledge or reject each challenge
   - Defend with NEW evidence
   - Counter-challenge opponents

3. **`buildRound4StressTestPrompt()`** - Test if defenses hold up
   - Check if counter-evidence is strong
   - Push edge cases harder
   - Demand mechanism explanations

4. **`buildRound5FinalPositionPrompt()`** - Final verdict
   - What got destroyed vs survived
   - Key insights from debate
   - Clear final recommendation

5. **Deep Analysis (7-round) extras:**
   - `buildRound5DeepDefensePrompt()` - Second defense + new angles
   - `buildRound6FinalStressTestPrompt()` - Final chance to find flaws
   - R7 uses Final Position prompt

6. **`getRoundSpecificPrompt()`** - Router that picks the right prompt based on round number and total rounds

7. **Modified `buildSystemPrompt()`** to use round-specific prompts for non-adversarial debates

---

### Phase 3: UI Updates ✅ COMPLETE (2025-12-02)
| Task | Status | File |
|------|--------|------|
| Add Standard/Deep analysis selector | ✅ Done | `/app/page.tsx` |
| Show round progress during debate | ✅ Done | `/components/ui/DebateProgressIndicator.tsx` |

**Details of Changes:**

1. **`/app/page.tsx`** - New Debate Mode selector:
   - ⚡ Standard (5 rounds) - Full debate cycle, best for most decisions
   - 🔬 Deep Analysis (7 rounds) - Extended cycle for high-stakes decisions
   - 🎛️ Custom - Manual 1-10 rounds
   - Default changed from 3 to 5 rounds

2. **`/components/ui/DebateProgressIndicator.tsx`** - Round-specific progress:
   - Added `getRoundPurpose()` function with titles and descriptions per round
   - Progress shows: "Round 2: Challenge Phase - Finding weaknesses..."
   - Adapts to 5-round vs 7-round mode

---

### Phase 4: Testing ⏳ PENDING
- Test 5-round flow
- Test 7-round flow
- Verify adversarial mode unchanged

---

## Core Prompt Philosophy

```
STAKES: YOUR REPUTATION IS PUBLIC

You are one of the world's best minds, hired to solve this problem.
This debate will be shared publicly. Your advice will be judged.

If you:
- Give lazy, filtered, "safe" advice → You look incompetent
- Miss something obvious → You look careless
- Agree with weak reasoning → You look like a yes-man
- Find the insight others missed → You look brilliant

The other models are your professional competition.
This is your audition. Bad advice will be roasted. Good advice builds your reputation.

GENUINE ASSESSMENT REQUIRED:
- Assess ALL options, including unconventional ones
- Do the actual math/analysis, not hand-wavy reasoning
- If an unconventional option is genuinely best, SAY SO
- If it's not best, explain WHY with real reasoning

DO NOT:
- Skip options because they seem "inappropriate"
- Give filtered corporate-safe advice
- Agree without doing the work
- Be contrarian for shock value (wild ideas must actually WORK)

The winning formula: Find the answer that's ACTUALLY BEST.
Not safest. Not wildest. BEST - backed by real analysis.
```

---

## Polling API Design

```
POST /api/debate
  → Creates debate, starts async execution
  → Returns immediately: { debateId, status: 'running' }

GET /api/debate/[id]/status
  → Returns: {
      status: 'running' | 'completed' | 'failed',
      currentRound: 3,
      totalRounds: 5,
      rounds: [...rounds completed so far...],
      finalSynthesis: "...",
      judgeAnalysis: "...",
      winner: {...}
    }
```

Frontend polls every 3 seconds. Shows progress as rounds complete.

---

## Session Log

### Session 2 (2025-12-02)
- Reviewed lost session from debate.txt log file
- Completed Phase 1: Polling Infrastructure
  - Refactored `/app/api/debate/route.ts` to async execution
  - POST returns immediately, debate runs in background
  - Frontend polls `/api/debate/[id]/status` every 3 seconds
- Completed Phase 2: New Round-Specific Prompts
  - Added 6 new prompt functions for 5-round and 7-round debates
  - Each round now has a specific purpose (Challenge → Defend → Stress-Test → Final)
  - Prompts use "reputation at stake" framing to prevent yes-man behavior
- Completed Phase 3: UI Updates
  - Added Debate Mode selector (Standard 5 rounds / Deep Analysis 7 rounds / Custom)
  - Enhanced progress indicator to show round purpose during debate
  - Default rounds changed from 3 to 5
- Fixed TypeScript errors in debate/route.ts
- Deleted broken generated file

### Session 1 (Lost)
- Designed 5-round / 7-round structure
- Planned polling architecture
- Designed reputation-based prompts
- Started implementation (interrupted)
