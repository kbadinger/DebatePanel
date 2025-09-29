# Model Discovery System - Complete Guide

## 🎯 Overview

You now have a **three-layer automated model discovery system** that ensures you never miss another AI model release.

### What Was Built

1. **Layer 1: API Discovery** - Queries provider APIs directly for real model lists
2. **Layer 2: GitHub Actions Automation** - Weekly scans + PR verification
3. **Layer 3: RSS/Blog Monitoring** - Catches announcements within hours

---

## 🚀 Quick Start

### Run Manual Model Scan

```bash
# Basic scan
npm run scan-models

# With verification (tests each model)
npm run scan-models --verify

# Generate config code
npm run scan-models --generate
```

### Example Output

```
🔍 Full Model Scanner - API-First Discovery
======================================================================

📡 Querying provider APIs...

✅ OPENAI       8 models (8 verified)
✅ ANTHROPIC    10 models (10 verified)
✅ GOOGLE       6 models (6 verified)
✅ XAI          4 models (4 verified)
✅ DEEPSEEK     2 models (2 verified)

──────────────────────────────────────────────────────────────────────
📊 Total: 30 models | ✅ 30 verified | ❌ 0 errors
──────────────────────────────────────────────────────────────────────

🔍 Comparing with current configuration...

📋 Current config: 35 models
🆕 New models found: 3
⚠️  Missing from API: 5
✅ Matched: 27

🆕 NEW MODELS DISCOVERED:
──────────────────────────────────────────────────────────────────────
   openai       gpt-5-mini
                → GPT-5 Mini
   openai       gpt-5-nano
                → GPT-5 Nano
   anthropic    claude-sonnet-4-5-20250929
                → Claude Sonnet 4.5 (Sep 2025)
```

---

## 📁 Files Created

### Core Discovery System

1. **`lib/models/api-discovery.ts`**
   - `discoverOpenAIModels()` - Queries OpenAI /v1/models API
   - `discoverAnthropicModels()` - Verifies Claude models
   - `discoverGoogleModels()` - Queries Gemini API
   - `discoverXAIModels()` - Queries Grok API
   - `discoverDeepSeekModels()` - Queries DeepSeek API
   - `discoverAllModels()` - Runs all providers
   - `compareWithConfig()` - Diffs against current config
   - `generateConfigCode()` - Creates ready-to-paste TypeScript

2. **`scripts/full-model-scan.ts`**
   - Complete CLI tool for model discovery
   - Generates reports and config code
   - Handles all providers automatically

### GitHub Actions Workflows

3. **`.github/workflows/model-discovery.yml`**
   - Runs every Monday at 9am UTC
   - Creates PRs when new models found
   - Uploads discovery reports as artifacts

4. **`.github/workflows/model-verification.yml`**
   - Runs on PRs touching model files
   - Verifies all configured models work
   - Comments on PRs with results

5. **`.github/workflows/rss-monitor.yml`**
   - Runs every 6 hours
   - Checks provider blogs/announcements
   - Creates GitHub issues for alerts
   - Weekly digest on Mondays

### Configuration

6. **`lib/monitoring/feed-sources.json`**
   - List of RSS feeds and blogs to monitor
   - Keywords for detection
   - Alert priority levels

---

## 🔄 How It Works

### Layer 1: API Discovery (Manual/Automated)

```
Weekly Schedule (Monday 9am)
     ↓
Query all provider APIs
     ↓
Compare with current config
     ↓
Found new models?
  YES → Create PR
  NO  → Done
```

**What it catches:**
- ✅ Models added to provider APIs
- ✅ Exact API model names
- ✅ Context window limits
- ✅ Verified availability

**What it misses:**
- ❌ Models not yet in API
- ❌ Announcement timing (24-168hr lag)

### Layer 2: GitHub Actions (Automated)

#### Model Discovery Workflow
- **Trigger**: Every Monday at 9am + manual
- **Actions**:
  1. Runs `npm run scan-models --generate`
  2. Creates PR if new models found
  3. Uploads report artifacts
  4. Labels PR for review

#### Model Verification Workflow
- **Trigger**: PRs touching `lib/models/**`
- **Actions**:
  1. Verifies all configured models work
  2. Comments on PR with results
  3. Flags any broken models

### Layer 3: RSS Monitoring (Early Warning)

```
Every 6 Hours
     ↓
Check provider blogs/feeds
     ↓
Keywords detected?
  YES → Create GitHub Issue
  NO  → Continue monitoring
     ↓
Weekly Digest (Monday)
```

**What it catches:**
- ✅ Announcements within 6 hours
- ✅ Blog posts about new models
- ✅ API availability news

**What it creates:**
- GitHub issues for alerts
- Weekly digest issues
- Labels: `models`, `announcement`

---

## 🛠️ Setup Required

### 1. Configure GitHub Secrets

Add these to your repository secrets:

```
Settings → Secrets and variables → Actions → New repository secret
```

Required secrets:
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_AI_API_KEY`
- `XAI_API_KEY`
- `DEEPSEEK_API_KEY`
- `MISTRAL_API_KEY` (optional)
- `PERPLEXITY_API_KEY` (optional)

### 2. Enable GitHub Actions

1. Go to repository Settings → Actions → General
2. Set "Workflow permissions" to "Read and write permissions"
3. Check "Allow GitHub Actions to create and approve pull requests"

### 3. Test the System

```bash
# Manual test
npm run scan-models --generate

# Trigger GitHub Action manually
# Go to Actions tab → Weekly Model Discovery → Run workflow
```

---

## 📊 What You Get

### Daily Operations

**No new models:**
- ✅ Weekly scan runs silently
- ✅ No action needed from you

**New models found:**
1. 🔔 PR created automatically
2. 📝 Configuration code generated
3. ✅ Review checklist included
4. 📊 Discovery report attached

### Early Warnings

**Provider announcement:**
1. 🚨 GitHub issue created within 6 hours
2. 📋 Links to announcement
3. ✅ Action checklist
4. 🔗 Direct links to provider blogs

---

## 🎯 Workflow When New Models Found

### Automated PR Process

1. **Monday morning** - GitHub Action runs
2. **New models detected** - PR created with:
   - Model comparison report
   - Generated TypeScript code
   - Pricing research checklist
   - Test instructions

3. **Your review** (5-10 minutes):
   - ✅ Review new model names
   - ✅ Copy config code to `lib/models/config.ts`
   - ✅ Add pricing to `lib/models/pricing.ts`
   - ✅ Add roles to `MODEL_ROLES`
   - ✅ Add context limits to `MODEL_CONTEXT_LIMITS`
   - ✅ Test in development
   - ✅ Merge PR

### Manual Discovery Process

If you hear about a new model:

```bash
# 1. Run discovery
npm run scan-models --generate

# 2. Check for the model
# If found, code is in model-updates.ts

# 3. Follow standard update process
# - Add to config.ts
# - Add pricing.ts
# - Update roles and limits
# - Test and deploy
```

---

## 🎨 Examples

### New Model Detected

**GitHub PR:**
```
🆕 New AI Models Discovered

3 new models discovered from provider APIs:

- gpt-5-mini (OpenAI)
- gpt-5-nano (OpenAI)
- claude-sonnet-4-5-20250929 (Anthropic)

Manual steps required:
☐ Add pricing information
☐ Add model roles/strengths
☐ Test in development
☐ Update status documentation
```

### RSS Alert

**GitHub Issue:**
```
🚨 Potential New Model Announcement: Anthropic

The RSS monitor detected a potential announcement from Anthropic.

What to do:
1. Visit https://www.anthropic.com/news
2. Confirm new model
3. Run: npm run scan-models --generate
4. Follow update process
```

---

## 🔧 Troubleshooting

### "No models found from OpenAI"

**Cause**: API key not configured or invalid

**Fix**:
```bash
# Check API key
echo $OPENAI_API_KEY

# Set in .env.local
OPENAI_API_KEY=sk-...

# Or set GitHub secret
```

### "Model verification failed"

**Cause**: Model deprecated or API changed

**Fix**:
1. Check provider documentation
2. Update model ID if changed
3. Remove if deprecated
4. Add backward compatibility note

### GitHub Action not creating PRs

**Cause**: Missing workflow permissions

**Fix**:
1. Settings → Actions → General
2. Workflow permissions → Read and write
3. ✅ Allow creating PRs

---

## 📈 Success Metrics

After 4 weeks, you should see:

- ✅ **0 missed model releases** (all caught within 7 days)
- ✅ **Automatic PRs** for every new model
- ✅ **Early warnings** within 6 hours of announcements
- ✅ **Verified models** on every PR
- ✅ **Weekly digests** summarizing activity

---

## 🚀 Advanced Usage

### Extend to New Providers

1. Add discovery function to `lib/models/api-discovery.ts`
2. Add to `discoverAllModels()`
3. Add feed sources to `lib/monitoring/feed-sources.json`
4. Add API key to GitHub secrets

### Custom Notifications

Edit `.github/workflows/rss-monitor.yml`:

```yaml
# Add Slack webhook
- name: Notify Slack
  run: |
    curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
      -d '{"text":"🚨 New AI model detected!"}'
```

### On-Demand Checks

```bash
# Check specific provider
npm run scan-models -- --provider openai

# Verbose output
npm run scan-models -- --verbose

# Save to file
npm run scan-models --generate > report.txt
```

---

## 📚 Related Documentation

- `MODEL_MANAGEMENT.md` - Manual model management
- `LATEST_MODELS_STATUS.md` - Current model status
- `lib/models/config.ts` - Model configuration
- `lib/models/pricing.ts` - Pricing information

---

## 🎉 You're All Set!

Your model discovery system is now:

✅ **Automated** - Runs weekly without intervention
✅ **Fast** - Catches announcements within 6 hours
✅ **Accurate** - Verifies models with API calls
✅ **Comprehensive** - Three independent detection layers
✅ **Actionable** - Generates ready-to-use code

**Next model release?** You'll know before most developers do. 🚀