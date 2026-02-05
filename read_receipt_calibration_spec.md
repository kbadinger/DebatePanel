# Read Receipt + Calibration — Full Spec (Web App)

**Version:** 1.0
**Date:** 2026-01-11
**Project shorthand:** *Read Receipt*

---

## 1) Product in One Sentence

A mobile-first daily game where you **lock your takes**, friends **bet on humanity then predict you**, and the app generates a shareable **Receipt** showing how well they read both you AND the world.

---

## 2) Why This Works (The Brain Workout Thesis)

Mindless games spike and die. Games that make your brain work go viral AND stay sticky.

**Read Receipt is NOT mindless because:**
- Every prompt requires TWO judgments (global % bet + friend prediction)
- Players develop real skills (calibration + social reading)
- You actually get better over time
- Walking away feeling sharper, not dumber

**The dual skill curves:**
| Skill | What You're Learning |
|-------|---------------------|
| **Calibration** | Probabilistic thinking, reading humanity, estimating distributions |
| **Social Reading** | Theory of mind, modeling specific people, understanding friends |

This is chess energy, not TikTok energy.

---

## 3) North Star Emotion & Growth Behavior

### Primary Emotions
- **Discovery:** "I had no idea 67% of people think that..."
- **Humiliation/roast (non-toxic):** "You thought you knew me..."
- **Pride:** "I'm getting really good at reading people"

### Growth Behavior
Players share receipts because:
- "Look how wrong you were about me"
- "Look how wrong you were about EVERYONE"
- "I'm a 94% calibrated human-reader"

---

## 4) Core Constraints

- **Mobile-first responsive web** (PWA optional later)
- **One-handed, minimal tutorial**
- **Async**: target locks answers, others respond later
- **Daily reset**: 1 daily pack per day (24h cadence)
- **Session length**: 60–120 seconds per opponent/day (slightly longer due to calibration)
- **Skill-forward**: calibration + social reading (not reflex)
- **Low content treadmill**: prompt bank + weekly generation pipeline
- **Anti-cheat**: commit → commit → reveal, server enforcement

---

## 5) Game Flow

### 5.1 Flow A — Target: Lock Your Takes (unchanged)

1. **Landing**
   - CTA: "Lock today's takes"
2. **Lock Today (5 prompts)**
   - 1 prompt/screen
   - 5 anchored buttons
3. **Share Challenge**
   - "I locked my takes. How well do you know me AND humanity?"
   - Buttons: Share (Web Share API) + Copy link

**No account wall before share.**

### 5.2 Flow B — Predictor: Calibrate + Predict (NEW)

1. **Challenge Landing** (`/c/:challenge_id`)
   - "How well do you read {Name}? And humanity?"

2. **For Each Prompt (x5):**

   **Step 1: Global Calibration Bet**
   ```
   "What % of people picked each answer?"

   [Prompt text]

   Early Bird          [___]%
   Morning Person      [___]%
   Whenever            [___]%
   Night Owl           [___]%
   Late Night Creature [___]%
                       -------
                        100%
   ```

   *Simplified option for MVP:* Single slider for most popular answer
   ```
   "What % picked the most popular answer?"
   [Slider: 20% ----●---- 80%]
   ```

   **Step 2: Friend Prediction**
   ```
   "What did {Name} pick?"

   [5 anchored buttons]
   ```

3. **Receipt (immediate reveal)**
   - Global reality vs your bets
   - Friend's actual answer vs your prediction
   - Dual scores + verdict

### 5.3 Flow C — Returning User Daily

Home shows:
- Lock status: "Locked" / "Lock today"
- "X people read you today"
- Leaderboard: "Who knows you best?" (Read Score)
- Leaderboard: "Who knows humanity best?" (Calibration Score)
- Your personal stats: "Your calibration: 73% | Your read accuracy: 6.2/10"

---

## 6) Scoring System

### 6.1 Calibration Score (Global % Betting)

**Full Distribution Mode (harder, more skill):**
Player distributes 100% across 5 options. Score based on divergence from actual.

```
Brier Score = (1/n) × Σ(predicted_% - actual_%)²
```

Lower = better. Convert to 0-100 scale for display.

**Simplified Mode (MVP recommended):**
Player guesses % for most popular answer only.

```
calibration_error = abs(guessed_% - actual_%)
```

Per-prompt calibration: 0-100 (0 = perfect)
Daily calibration: average across 5 prompts

**Display as:**
- "73% Calibrated" (100 - average_error)
- Or letter grade: A/B/C/D/F

### 6.2 Read Score (Friend Prediction)

Same as original spec:

```
diff_i = abs(predicted_answer - actual_answer)  // 0-4 scale
```

Per-prompt: 0-4 (0 = exact match)
Accuracy points:
- diff 0 → 2 pts
- diff 1 → 1 pt
- diff 2-4 → 0 pts

**Read Score: 0-10** (sum of accuracy points)

### 6.3 Combined "Human Reader" Score (optional)

```
human_reader_score = (calibration_normalized × 0.4) + (read_score_normalized × 0.6)
```

Weight read score higher since it's the core social mechanic.

### 6.4 Biggest Misses (for Receipt)

Track:
- **Biggest calibration miss:** Prompt where % bet was furthest from reality
- **Biggest read miss:** Prompt where friend prediction was most wrong

---

## 7) The Receipt (Updated)

Receipts are **the product**. Now with dual scores.

### 7.1 Receipt Must Include

```
┌─────────────────────────────────────┐
│  {Predictor} read {Target}          │
│                                     │
│  READ SCORE:    7/10    ████████░░  │
│  CALIBRATION:   61%     ██████░░░░  │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  BIGGEST MISREAD:                   │
│  "Morning person vs night owl?"     │
│  You said: Night Owl                │
│  Kevin said: Early Bird             │
│                                     │
│  BIGGEST REALITY CHECK:             │
│  "Pineapple on pizza?"              │
│  You thought: 20% say yes           │
│  Reality: 54% say yes               │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  VERDICT: "You know Kevin better    │
│  than you know humanity."           │
│                                     │
│  [Beat This] [Read Me Back]         │
└─────────────────────────────────────┘
```

### 7.2 Verdict Templates (Dual-Score Matrix)

| Calibration | Read Score | Verdict |
|-------------|------------|---------|
| High (>75%) | High (>7) | "Certified Human Expert. Scary good." |
| High (>75%) | Low (<5) | "You understand humanity, just not {Name}." |
| Low (<50%) | High (>7) | "You know {Name}, but you don't know people." |
| Low (<50%) | Low (<5) | "You don't know {Name} OR humans. Impressive." |
| Mid | Mid | "Average human reader. Room to grow." |

### 7.3 Additional Verdict Copy (by calibration bands)

**Calibration-specific roasts:**
- 90%+: "Are you a pollster? This is suspicious."
- 75-89%: "You actually understand how people think."
- 50-74%: "Your model of humanity needs work."
- 25-49%: "You live in a bubble. A weird one."
- <25%: "You have never met another human being."

---

## 8) Data Model (Updated)

### 8.1 New/Modified Tables

**prompts** (updated)
```
- id
- category
- risk_tier
- prompt
- anchors[5]
- why_it_works
- active
- actual_distribution[5]     // NEW: real % for each anchor (updated rolling)
- total_responses            // NEW: count for statistical significance
- last_distribution_update   // NEW: timestamp
```

**predictions** (updated)
```
- prediction_id
- challenge_id
- date
- target_user_id
- predictor_user_id
- predicted_answers[5]       // 0-4 per prompt
- calibration_bets[5]        // NEW: % bet per prompt (simplified: single value)
- submitted_at
- read_score                 // 0-10
- calibration_score          // NEW: 0-100
- combined_score             // NEW: optional weighted combo
```

**global_responses** (NEW - for tracking actual distributions)
```
- date
- prompt_id
- answer_distribution[5]     // count per anchor
- total_responses
- updated_at
```

### 8.2 Aggregation Strategy

**Option A: Real-time (more accurate, more complex)**
- Every lock updates global_responses
- Distribution calculated on-demand

**Option B: Batch (simpler, slight lag)**
- Nightly job aggregates all locks
- Distribution updated daily
- First day uses seed data / estimates

**Recommendation:** Option B for MVP. Simpler, and day-old data is fine for calibration.

---

## 9) Global Distribution Tracking

### 9.1 Cold Start Problem

Day 1: No data on what % picked each answer.

**Solutions:**
1. **Seed estimates:** Content team estimates expected distribution per prompt
2. **Bootstrap period:** First N days, don't show calibration scores (just collect data)
3. **Rolling window:** Use last 7-30 days of data, ignore older

**Recommendation:** Seed estimates + rolling 14-day window after sufficient data.

### 9.2 Statistical Significance

Don't show calibration scores until prompt has N responses.

```
if (prompt.total_responses < 100) {
  show "Not enough data yet"
} else {
  show actual calibration score
}
```

### 9.3 Distribution Update Schedule

- **Real-time:** Update counts on every lock
- **Percentage calc:** Recompute on read (cached 1 hour)
- **Or:** Nightly batch job recalculates all distributions

---

## 10) API Surface (Updated)

### Existing (unchanged)
- `GET /api/today` → returns today's pack (5 prompts)
- `POST /api/lock` → locks user answers
- `POST /api/challenge` → creates open challenge from lock

### Updated
- `GET /api/challenge/:id` → pack + target display name + **global distributions (if available)**
- `POST /api/challenge/:id/predict` → submit prediction + **calibration bets**

### New
- `GET /api/prompt/:id/distribution` → returns current global % (if sufficient data)
- `GET /api/stats/me` → user's calibration history, read score history
- `GET /api/leaderboard/calibration` → top calibrators globally/among friends

---

## 11) Content System (Updated)

### 11.1 Prompt Requirements (Additional)

Each prompt should have:
- Clear anchors that real humans will distribute across (not 95% picking one)
- **Estimated distribution** (seed data for cold start)
- Categories that reveal interesting human variance

**Good calibration prompts:**
- Opinions that feel universal but aren't
- Preferences with surprising distributions
- "Everyone does X" assumptions that are wrong

**Bad calibration prompts:**
- Obvious answers (90%+ will pick same thing)
- Niche topics only some people understand
- Controversial topics with selection bias

### 11.2 Prompt Schema (Updated)

```json
{
  "id": "prompt_123",
  "category": "lifestyle",
  "risk_tier": 0,
  "prompt": "Your sleep schedule is...",
  "anchors": [
    "Early Bird (up by 6am)",
    "Morning Person (6-8am)",
    "Whenever (no pattern)",
    "Night Owl (up past midnight)",
    "Vampire (sleep at dawn)"
  ],
  "why_it_works": "People assume most are morning people but distribution is flatter",
  "estimated_distribution": [15, 25, 20, 30, 10],
  "calibration_difficulty": "medium"
}
```

### 11.3 Prompt QA (Additional Criteria)

Add to scoring rubric:
- **Distribution spread (1-5):** Will answers spread across options, or pile on one?
- **Calibration interest (1-5):** Will the actual % surprise people?

**New PASS rule additions:**
- Distribution spread ≥ 3
- No single anchor expected to get >60%

---

## 12) UX Considerations

### 12.1 Calibration Input (Critical Decision)

**Option A: Full Distribution (5 sliders that sum to 100%)**
- Pros: More skill expression, richer data
- Cons: High friction, math anxiety, slower

**Option B: Single Slider (guess % for most popular)**
- Pros: Fast, simple, still teaches calibration
- Cons: Less nuance, less skill ceiling

**Option C: Simplified Buckets**
```
"How common is the most popular answer?"
[ Rare (<30%) ] [ Common (30-60%) ] [ Dominant (>60%) ]
```
- Pros: Fastest, zero math
- Cons: Least skill expression

**Recommendation for MVP:** Option B (single slider).
Upgrade to Option A for power users / MVP+ if engagement is high.

### 12.2 Flow Timing Targets

| Step | Target Time |
|------|-------------|
| Global % bet | 5-8 seconds |
| Friend prediction | 3-5 seconds |
| Per prompt total | 8-13 seconds |
| Full 5 prompts | 60-90 seconds |

If calibration adds >50% to completion time, simplify.

### 12.3 Progressive Disclosure

**First 3 plays:** Simplified calibration (buckets or single slider)
**After 3 plays:** Unlock full distribution mode (optional)

This onboards without overwhelming.

---

## 13) Analytics (Updated)

### 13.1 New Events

- `calibration_bet_submitted` (prompt_id, bet_value)
- `calibration_revealed` (prompt_id, bet_value, actual_value, error)
- `distribution_viewed` (prompt_id)
- `calibration_mode_switched` (simple → full)

### 13.2 New Kill Metrics

- **Calibration completion rate:** Do people finish the slider or skip?
- **Calibration engagement:** Time spent on calibration vs prediction
- **Calibration improvement:** Are users getting more accurate over time?
- **Friction test:** Completion rate WITH calibration vs WITHOUT (A/B)

### 13.3 Calibration Quality Metrics

- Average calibration error by prompt (find bad prompts)
- User calibration improvement curve (are they learning?)
- Prompt distribution stability (is data reliable?)

---

## 14) MVP vs MVP+ (Updated)

### MVP (Ship This)

**Core:**
- Today pack selection + lock flow
- Open challenge link + guest play
- **Simplified calibration (single slider per prompt)**
- Receipt with dual scores
- Leaderboard per challenge (both scores)
- Basic report/block
- Analytics instrumentation

**Calibration:**
- Single slider: "What % picked most popular?"
- Seed distributions (estimated by content team)
- Batch nightly distribution updates

### MVP+ (Next)

**Enhanced Calibration:**
- Full distribution mode (5 sliders summing to 100%)
- Real-time distribution tracking
- Personal calibration history + improvement graphs
- "Calibration training" mode (practice without friend)

**Social:**
- Rivalry 1v1 mode
- Global leaderboards (top calibrators)
- Calibration streaks

**Content:**
- Auto-flag prompts with poor distribution spread
- Dynamic difficulty (show harder calibration to good players)

---

## 15) A/B Test Plan

### Test 1: Calibration Friction

**Variants:**
- A: No calibration (original Read Receipt)
- B: Simplified calibration (single slider)
- C: Full calibration (5 sliders)

**Metrics:**
- Completion rate
- Time to receipt
- Receipt share rate
- D7 retention

**Hypothesis:** B will have similar completion to A with higher retention.

### Test 2: Calibration Visibility

**Variants:**
- A: Show calibration score prominently on receipt
- B: De-emphasize calibration, focus on read score

**Metrics:**
- Which receipts get shared more?
- Which version has more "read me back" conversions?

---

## 16) Risk Mitigation

### Risk: Calibration kills completion rate

**Mitigation:**
- Start with simplest calibration (buckets or single slider)
- Make calibration skippable (but lose that part of score)
- A/B test aggressively before full rollout

### Risk: Cold start (no distribution data)

**Mitigation:**
- Seed all prompts with estimated distributions
- Don't show calibration score until prompt has 100+ responses
- Rolling 14-day window for freshness

### Risk: Gaming calibration

**Mitigation:**
- Server-side scoring only
- Rate limit distribution API queries
- Flag statistically improbable accuracy (>95% over 20+ plays)

---

## 17) Success Metrics

### North Star
**"Calibrated Human Readers"** = Users with calibration score >70% over 10+ predictions

### Supporting Metrics

| Metric | Target |
|--------|--------|
| Completion rate (with calibration) | >70% of starts |
| Calibration improvement (D1→D7) | >10% improvement |
| Receipt share rate | >15% |
| D7 retention | >25% |
| "Read me back" conversion | >30% |

---

## 18) Launch Checklist

### Pre-Launch
- [ ] 300+ prompts with seed distributions
- [ ] Calibration UI built (simplified slider)
- [ ] Receipt templates with dual scores
- [ ] Distribution tracking pipeline
- [ ] Analytics events instrumented

### Launch
- [ ] A/B test: calibration vs no calibration
- [ ] Monitor completion rates closely
- [ ] Daily distribution recalculation job running
- [ ] Prompt health dashboard (flag bad distributions)

### Week 1
- [ ] Review calibration friction data
- [ ] Adjust/simplify if completion dropping
- [ ] Identify best/worst calibration prompts

---

## 19) Open Questions

1. **Calibration mode for MVP:** Single slider vs buckets vs skip entirely for V1?
2. **Cold start strategy:** How long to bootstrap before showing calibration scores?
3. **Scoring weights:** How much should calibration affect combined score?
4. **Skip option:** Allow skipping calibration (with score penalty)?
5. **Distribution freshness:** 7-day vs 14-day vs 30-day rolling window?

---

## 20) Summary

Read Receipt + Calibration = A social game that makes your brain work.

**The pitch:**
> "Lock your takes. Friends predict you AND bet on humanity. See how well they read you—and everyone else."

**Why it wins:**
- Not mindless (dual skill curves)
- Net positive (you get sharper)
- Viral (receipts are inherently shareable)
- Sticky (skill progression keeps you coming back)

Chess energy. Not TikTok energy.
