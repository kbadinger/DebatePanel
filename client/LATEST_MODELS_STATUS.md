# Latest AI Models Status - September 2025

## ✅ CONFIRMED WORKING MODELS

### OpenAI
**GPT-5 Series (August 2025)**
- ✅ `gpt-5` - Flagship model ($1.25/$10 per 1M tokens)
- ✅ `gpt-5-mini` - Smaller, faster variant ($0.25/$2 per 1M tokens)
- ✅ `gpt-5-nano` - Ultra-light variant ($0.05/$0.40 per 1M tokens)

**o3 Series**
- ✅ `o3` - Advanced reasoning (requires special params)
- ✅ `o3-mini` - Smaller o3 variant

**o1 Series**
- ✅ `o1` - Reasoning model (requires special params)
- ✅ `o1-mini` - Smaller reasoning model

**GPT-4 Series**
- ✅ `gpt-4o` - Current standard
- ✅ `gpt-4o-mini` - Smaller variant
- ✅ `gpt-4-turbo` - Turbo variant

### Anthropic
**Claude 4.5 Series (LATEST - September 29, 2025)**
- ✅ `claude-sonnet-4-5-20250929` - "Best coding model in the world" ($3/$15 per 1M tokens)

**Claude 4.1 Series (August 2025)**
- ✅ `claude-opus-4-1-20250805` - Flagship Claude 4.1 with 30hr autonomous runtime

**Claude 4 Series (May 2025)**
- ✅ `claude-sonnet-4-20250514` - Claude Sonnet 4
- ✅ `claude-opus-4-20250514` - Claude Opus 4

**Claude 3.7 Series (February 2025)**
- ✅ `claude-3-7-sonnet-20250219` - Claude 3.7 Sonnet

**Claude 3.5 Series (October 2024)**
- ✅ `claude-3-5-sonnet-20241022` - Claude 3.5 Sonnet (October)
- ✅ `claude-3-5-sonnet-20240620` - Claude 3.5 Sonnet (June)
- ✅ `claude-3-5-haiku-20241022` - Fast variant

**Claude 3 Series**
- ✅ `claude-3-opus-20240229`
- ✅ `claude-3-haiku-20240307`

### X.AI (Grok)
- ✅ `grok-4` - Latest (requires SuperGrok subscription)
- ✅ `grok-3` - (requires SuperGrok subscription)
- ✅ `grok-2` - Standard access
- ✅ `grok-2-1212` - December 2024 release

## 🚨 IMPORTANT NOTES

### API Parameter Changes
GPT-5 and o3 models require different parameters:
- Use `max_completion_tokens` instead of `max_tokens`
- No `temperature` parameter support
- SDK updates needed for full compatibility

### Naming Conventions
- Anthropic uses **hyphens** not dots: `claude-3-5-sonnet` NOT `claude-3.5-sonnet`
- OpenAI GPT-5 works with standard naming: `gpt-5`, `gpt-5-mini`, etc.

### Access Requirements
- **Grok 4**: Requires SuperGrok subscription ($30/month)
- **GPT-5**: Available via standard OpenAI API
- **Claude 4**: Available via standard Anthropic API

## 📊 Model Discovery Results

Total models discovered: **70+**
- Working models: **46**
- Models requiring special params: **13**

## 🔧 Configuration Status

### ✅ Configured and Ready
- GPT-5 series (with SDK warning)
- Claude 4 series
- Claude 3.7, 3.5, and 3 series
- Grok 4 (with SuperGrok)
- Standard GPT-4 models

### ⚠️ Needs SDK Updates
- GPT-5 models (for proper parameter handling)
- o3 models (for reasoning support)
- o1 models (for reasoning support)

## 🚀 Automated Discovery

GitHub Action configured to:
- Check daily for new models
- Test each model automatically
- Create PR when new models found
- Track in `discovered-models.json`

## 💰 Pricing Tiers

### Flagship Models ($$$$$)
- GPT-5
- Claude Opus 4.1
- o3

### Premium Models ($$$$)
- Claude Sonnet 4
- GPT-4o
- Grok 4

### Standard Models ($$$)
- Claude 3.5 Sonnet
- GPT-4o-mini
- Grok 2

### Budget Models ($$)
- Claude 3.5 Haiku
- GPT-5-nano
- DeepSeek

## 📈 Recommendations

1. **Use Claude Opus 4.1** for most complex debates
2. **Use GPT-5** for cutting-edge capabilities (once SDK updated)
3. **Use Claude Sonnet 4** for balanced performance/cost
4. **Use Grok 4** for real-time information needs

## 🔄 Last Updated
September 29, 2025 - Claude Sonnet 4.5 added (released today!), GPT-5 variants confirmed






















