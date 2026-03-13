# Profile System Guide

## Overview

Profiles let you add personal context to debates using `@profileName` syntax. When you mention a profile in your debate topic or description, the system:

1. Fetches your profile(s)
2. Uses GPT-4o-mini to extract only the relevant context for that specific debate
3. Injects the condensed context into all AI model prompts

This means you can have rich, detailed profiles and the system will intelligently pull just what matters for each debate.

## Creating Profiles

Go to `/profiles` to create and manage your profiles. Each profile has:
- **Name**: The @mention trigger (e.g., `work` = `@work`)
- **Content**: JSON blob with your context

## JSON Structure

**There is no enforced schema.** The LLM preprocessor handles any reasonable JSON structure. However, here's a recommended template that provides good material for context extraction:

```json
{
  "who": {
    "name": "Your name",
    "role": "What you do",
    "background": "Brief professional/personal background"
  },
  "expertise": [
    "Area 1",
    "Area 2",
    "Area 3"
  ],
  "perspectives": {
    "values": "What you prioritize in decision-making",
    "biases": "Known leanings (e.g., 'prefer pragmatic over theoretical')",
    "style": "How you like to approach problems"
  },
  "context": {
    "current_work": "What you're focused on now",
    "goals": "What you're trying to achieve",
    "constraints": "Limitations, resources, things to consider"
  },
  "freeform": "Any other relevant information - nest it, paragraph it, whatever feels natural"
}
```

## Why No Strict Schema?

The accuracy comes from the LLM preprocessing step, not the JSON structure. GPT-4o-mini understands:

```json
{"job": "engineer"}
{"role": "engineer"}
{"background": {"profession": "engineer"}}
```

All equally well. The LLM normalizes whatever you provide. A rigid schema would add friction without improving extraction quality.

## What Actually Affects Accuracy

1. **Rich content** - More detail gives the LLM more to work with
2. **Relevant detail** - Include things that might matter across different debate topics
3. **Clear debate topics** - Helps the LLM know what to extract

## Example Profiles

### Work Profile (`@work`)
```json
{
  "role": "Senior Software Engineer at StartupCo",
  "focus": "Building AI-powered developer tools",
  "team": "Small team (5 engineers), moving fast",
  "constraints": {
    "timeline": "Need to ship MVP in 3 months",
    "budget": "Limited, prefer open-source solutions",
    "tech_stack": "TypeScript, Next.js, PostgreSQL"
  },
  "priorities": [
    "Ship fast, iterate based on feedback",
    "Keep architecture simple until proven necessary",
    "Developer experience matters"
  ],
  "pain_points": [
    "Previous microservices experience was painful at small scale",
    "Burned by over-engineering in past projects"
  ]
}
```

### Personal Profile (`@personal`)
```json
{
  "interests": ["AI/ML", "productivity systems", "indie hacking"],
  "learning": "Currently exploring LLM applications",
  "values": {
    "simplicity": "Prefer simple solutions that work over complex elegant ones",
    "pragmatism": "Results over theory"
  },
  "context": "Building side projects to explore AI tools"
}
```

## Usage Examples

**Debate topic:** "Should we use microservices or a monolith? @work"

The system will extract from your `@work` profile:
- Small team context
- Timeline constraints
- Past microservices pain points
- Preference for simplicity

It will ignore unrelated fields.

**Debate topic:** "Is it worth learning Rust in 2024? @personal"

The system pulls:
- Current interests and learning focus
- Values around pragmatism
- Side project context

## Multiple Profiles

You can mention multiple profiles: `@work @personal`

The system fetches all mentioned profiles and extracts relevant context from each, combining them into a single condensed context block.

## Limits

- Max 10 profiles per user
- Max 3 profiles per debate
- Profile content max 10KB
- Profile names: 2-30 characters, alphanumeric + hyphens

## Tips

1. **Create role-specific profiles** - `@work`, `@investor`, `@parent` - different contexts for different debates
2. **Include your biases** - The AI can factor in your known leanings
3. **Add constraints** - Budget, time, team size - these shape good recommendations
4. **Update as things change** - Your context evolves, keep profiles current
5. **Be detailed** - You can't overshare; the LLM only extracts what's relevant
