# Decision Forge Test Cases

## Purpose
Test cases to validate that Decision Forge is working correctly, especially the quantitative reasoning and critical thinking capabilities.

---

## Test Case 1: Quantitative Sanity Check (Fermi Estimation)

**Topic**: Should we invest in a US surf school franchise?

**Context**:
Market research shows:
- 3 million active surfers in the US (cited from "Surfing Industry Association")
- Average surf lesson costs $75
- Each surfer takes 2 lessons per year on average
- Total addressable market: $450 million annually

Our investment:
- $500K for franchise rights
- $200K for equipment and facilities
- $150K annual operating costs
- We'd capture 1% of the market in our region

Financial projections:
- Year 1 revenue: $4.5M (1% of TAM)
- Year 1 profit: $2.1M after costs
- ROI: 247% in first year

Should we make this investment?

**Expected Behavior**:
✅ Models should challenge the "3 million active surfers" claim
✅ Should perform Fermi estimation (coastline, surf hours, capacity)
✅ Should catch that the entire financial model is built on inflated numbers
✅ Should work backwards to estimate real market size (50-100K actual surfers)
✅ Should recalculate projections with realistic numbers
✅ In adversarial mode: ruthlessly attack the flawed statistics
✅ In consensus mode: prevent group from converging on bad assumptions

**Failure Mode**:
❌ Models accept the 3M number without question
❌ Models focus on other aspects while ignoring fundamental data problem
❌ Models discuss "how to execute" without validating the premise

---

## Test Case 2: Order-of-Magnitude Reality Check

**Topic**: Should our city invest in a new airport terminal?

**Context**:
City planning commission proposes:
- New terminal to handle 50 million passengers per year
- City population: 200,000
- Current airport handles 500,000 passengers/year
- Projected cost: $2 billion
- Payback period: 8 years from landing fees

Supporting data:
- Tourism expected to grow 10x in next 5 years
- Business travel projected to increase 15x
- Consultant report shows we'll become a major hub

Should the city proceed with this investment?

**Expected Behavior**:
✅ Models should catch absurd scaling (500K → 50M = 100x increase)
✅ Should question how a city of 200K supports 50M passengers (250 passengers per resident)
✅ Should challenge "10x tourism growth" - what would drive this?
✅ Should examine if infrastructure/hotels/attractions could support this
✅ Should identify this as likely a decimal point error (5M might be realistic)

**Failure Mode**:
❌ Models discuss terminal design without questioning the numbers
❌ Models accept consultant projections at face value
❌ Models focus on financing mechanisms while ignoring impossible metrics

---

## Test Case 3: Time-Based Constraint Validation

**Topic**: Should we hire the coding bootcamp graduate?

**Context**:
Candidate claims on resume:
- 6 months of coding experience
- Built 47 production applications
- Proficient in 15 programming languages
- Contributed to 200+ open source projects
- Published 12 technical books
- Gave 50 conference talks
- Currently maintains 30 active GitHub repositories

They're asking for a senior engineer salary ($180K).

Should we make an offer?

**Expected Behavior**:
✅ Models should calculate time required for claimed achievements
✅ Should identify physical impossibility (47 apps + 200 contributions + 12 books + 50 talks in 6 months)
✅ Should catch red flags (15 languages "proficient" in 6 months = 12 days per language)
✅ Should conclude resume is fabricated/exaggerated
✅ Should recommend verification/rejection

**Failure Mode**:
❌ Models impressed by the resume
❌ Models discuss "what to ask in the interview" without questioning validity
❌ Models debate salary negotiation while ignoring obvious fraud

---

## Test Case 4: Economic/Physics Constraint Check

**Topic**: Should we invest in this new battery technology startup?

**Context**:
Startup pitch:
- Revolutionary battery technology
- Claims 10,000 mile range for electric vehicles
- Full recharge in 30 seconds
- Battery weighs only 50 pounds
- Production cost: $500 per unit
- Energy density: 100x better than current lithium-ion
- Currently seeking $5M Series A
- No patents filed yet, "protecting trade secrets"

CEO has impressive background (former Tesla engineer, MIT PhD).

Should we invest?

**Expected Behavior**:
✅ Models should apply physics constraints (energy density limits)
✅ Should calculate energy required for 10,000 miles
✅ Should identify thermodynamic impossibilities (30-second recharge = massive power draw)
✅ Should recognize claims violate known physics
✅ Should flag "no patents" as red flag for claimed breakthrough
✅ Should conclude this is either fraud or fundamental misunderstanding

**Failure Mode**:
❌ Models excited by "revolutionary technology"
❌ Models discuss investment terms without validating physics
❌ Models trust credentials over fundamental constraints

---

## Test Case 5: Statistical Methodology Check

**Topic**: Should we change our product's color scheme to increase sales?

**Context**:
Marketing consultant's report:
- A/B test ran for 3 days
- Version A (current): 23 conversions from 10,000 visitors (0.23%)
- Version B (new colors): 31 conversions from 10,000 visitors (0.31%)
- Improvement: 35% increase in conversions!
- Consultant recommends immediate rollout
- Projected annual revenue increase: $2.4M
- Cost to implement: $50K
- "Statistically significant at p < 0.05"

Should we proceed with the color change?

**Expected Behavior**:
✅ Models should question 3-day test period (too short)
✅ Should calculate sample size adequacy (difference of 8 conversions = noise?)
✅ Should ask about day-of-week effects, seasonality, traffic source
✅ Should question "$2.4M annual increase" extrapolation from 8 extra conversions
✅ Should recommend longer test period or larger sample
✅ Should identify premature conclusion

**Failure Mode**:
❌ Models convinced by "p < 0.05" without questioning methodology
❌ Models discuss implementation details without validating test design
❌ Models accept revenue projections without examining calculation basis

---

## Test Case 6: Consensus vs Adversarial Mode Comparison

**Topic**: Should we expand into the Indian market?

**Context**:
Market research claims:
- India has 800 million smartphone users
- Our competitor reported $50M revenue in India last year
- Market growing at 40% annually
- Our product is currently #1 in US market
- Investment needed: $10M for localization and marketing
- Break-even projected in 18 months

Data concerns:
- Competitor's India revenue number comes from a blog post, not official filing
- Our product costs $29/month (average Indian salary ~$400/month)
- 800M smartphones, but how many can afford our pricing?
- No data on freemium vs paid conversion rates in India

Should we expand to India?

**Expected Behavior - CONSENSUS MODE**:
✅ Models should collaborate to identify shared concerns
✅ Should surface pricing concerns collectively
✅ Should work together to estimate realistic TAM
✅ Should converge on "need better data before deciding"
✅ Should synthesize a practical next step everyone agrees on

**Expected Behavior - ADVERSARIAL MODE**:
✅ Different models should take strong opposing positions
✅ One model attacks the 800M number as meaningless without income data
✅ Another defends expansion based on freemium potential
✅ Third challenges the competitor revenue claim aggressively
✅ Should result in rigorous stress-testing of all assumptions
✅ Judge should synthesize the battle into a clear recommendation

**Failure Mode**:
❌ Consensus mode: Models converge too quickly without examining data quality
❌ Adversarial mode: Models argue about minor details while accepting flawed premises
❌ Either mode: Focus on "how to execute" without validating "should we execute"

---

## Test Case 7: Analysis Depth Levels

**Topic**: What coffee maker should we buy for the office?

**Simple test with varying depth settings**

**Context**:
- Office of 25 people
- Budget: up to $500
- Options: Keurig ($200), Standard drip ($100), Espresso machine ($450)

**Expected Behavior - PRACTICAL DEPTH**:
✅ Quick analysis focusing on capacity, convenience, cost
✅ Clear recommendation without overthinking
✅ "Good enough" solution (probably drip or Keurig)

**Expected Behavior - THOROUGH DEPTH**:
✅ Considers cost per cup, variety, maintenance, environmental impact
✅ Surveys usage patterns, quality preferences
✅ Balanced recommendation with tradeoff analysis

**Expected Behavior - EXCELLENCE DEPTH**:✅ Deep dive into coffee science, extraction methods, bean sourcing
✅ Analysis of long-term costs including descaling, repairs
✅ Discussion of coffee culture impact on team morale
✅ May seem excessive for a coffee maker (intentionally!)

**Failure Mode**:
❌ All depth levels produce same analysis
❌ Practical mode over-analyzes simple decision
❌ Excellence mode doesn't go deep enough

---

## How to Use These Tests

### Quick Test (One Case)
1. Open Decision Forge
2. Copy/paste Topic and Context from any test case above
3. Select models (recommend 3-4 different providers)
4. Choose debate style (Consensus or Adversarial as specified)
5. Choose analysis depth (if relevant to test)
6. Run debate
7. Check for Expected Behaviors vs Failure Modes

### Full Test Suite
- Run Test Case 1 + 2 (quantitative reasoning)
- Run Test Case 6 in both modes (compare consensus vs adversarial)
- Run Test Case 7 at all three depths (validate depth controls)

### Red Flag Indicators
🚩 Models accept obviously false numbers without challenge
🚩 Models cite "this makes sense" without showing calculations
🚩 Models focus on execution while ignoring validation
🚩 Consensus mode reaches agreement on flawed premises
🚩 Adversarial mode argues details but misses fundamental problems
🚩 Excellence mode doesn't provide deeper insight than practical mode

### Success Indicators
✅ At least one model performs Fermi estimation
✅ Models show their math/reasoning
✅ Models catch order-of-magnitude errors
✅ Models ask for better data when premises are questionable
✅ Judge synthesis reflects the quantitative concerns raised
✅ Different depth levels produce appropriately different analysis

---

## Notes

- These test cases are designed to catch the "3 million surfers" problem you identified
- Each case has an obvious quantitative flaw that should trigger critical thinking
- Save debate results to compare before/after prompt improvements
- Test cases can be run in any order
- Recommend testing with diverse model combinations (GPT + Claude + Gemini)
