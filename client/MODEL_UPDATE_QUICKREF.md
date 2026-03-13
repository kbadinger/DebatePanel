# Model Update Quick Reference

## 🚀 Quick Commands

### Add a New Model (30 seconds)
```bash
# Example: Adding GPT-6 when it releases
npm run update-model -- --provider openai --id gpt-6 --name "GPT-6" --category flagship

# Example: Adding Claude 4
npm run update-model -- --provider anthropic --id claude-4 --name "Claude 4" --category premium
```

### Test the Model
```bash
npm run test-model -- gpt-6
```

### Deploy to Production
```bash
git add -A && git commit -m "Add GPT-6 to model registry" && git push
```

## 📋 Complete Workflow (2 minutes)

1. **Add Model**
   ```bash
   npm run update-model -- --provider openai --id gpt-6 --name "GPT-6" --category flagship
   ```

2. **Test It**
   ```bash
   npm run test-model -- gpt-6
   ```

3. **Deploy**
   ```bash
   git add -A && git commit -m "Add GPT-6" && git push
   ```

4. **Verify on Production**
   - Wait 1-2 minutes for Vercel deployment
   - Check https://your-app.vercel.app

## 🔧 Manual Update (When Script Doesn't Work)

Edit `/lib/models/model-registry.json`:

```json
{
  "id": "model-name",
  "apiName": "model-name",
  "displayName": "Model Display Name",
  "category": "flagship",
  "deprecated": false,
  "releaseDate": "2025-01",
  "verified": true
}
```

## 📊 Categories

- **flagship** - Latest & greatest (GPT-5, Claude 3.5 Opus)
- **premium** - High performance (GPT-4, Gemini Pro)
- **standard** - Balanced (GPT-5-mini)
- **budget** - Cost-efficient (GPT-5-nano, Haiku)
- **reasoning** - Special reasoning (o1, DeepSeek R1)

## 🔍 Check Available Models

```bash
# See all models in registry
cat lib/models/model-registry.json | jq '.providers.openai.models[].id'

# Test all providers
npm run test-providers
```

## 🚨 Emergency Rollback

```bash
# If something breaks after update
git revert HEAD && git push

# Or reset to last working version
git checkout HEAD~1 -- lib/models/model-registry.json
git commit -m "Revert model registry" && git push
```

## 📍 Key Files

- `/lib/models/model-registry.json` - Model list (EDIT THIS)
- `/lib/models/pricing.ts` - Token costs
- `/lib/models/providers.ts` - Provider configs

## 🎯 Common Model IDs

### OpenAI
- gpt-4o
- gpt-4o-mini
- gpt-5 *(new)*
- gpt-5-mini *(new)*
- o1, o1-mini

### Anthropic
- claude-3-5-sonnet-20241022
- claude-3-5-haiku-20241022
- claude-3-opus-20240229

### Google
- gemini-2.0-flash-exp
- gemini-2.5-pro *(new)*
- gemini-1.5-pro

### X.AI
- grok-beta
- grok-2-1212
- grok-4 *(new)*

## 💡 Pro Tips

1. **Always test before marking verified**
2. **Use exact API names** - Check provider docs
3. **Commit immediately** after testing works
4. **Monitor Vercel logs** after deployment
5. **Keep one model per commit** for easy rollback

---
*Last updated: January 2025*
