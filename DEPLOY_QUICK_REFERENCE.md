# 🚀 Quick Deploy Reference

## 🎯 Deploy Both Services (2 minutes)

### Step 1: Deploy Backend to Railway
```bash
cd debate-processor
git add -A && git commit -m "Update" && git push origin main
```
✅ Railway auto-deploys from GitHub

### Step 2: Deploy Frontend to Vercel  
```bash
cd debate-panel
git add -A && git commit -m "Update" && git push origin main
```
✅ Vercel auto-deploys from GitHub

---

## 🔥 Super Quick Deploy

### Option 1: Use Deploy Scripts
```bash
# Frontend only
cd debate-panel && npm run deploy

# Or use the script
./scripts/deploy.sh
```

### Option 2: One Command for Everything
```bash
# From project root
cd debate-processor && git add -A && git commit -m "Deploy $(date +%Y%m%d)" && git push && cd ../debate-panel && git add -A && git commit -m "Deploy $(date +%Y%m%d)" && git push
```

---

## 📍 URLs to Check

- **Frontend**: https://debate-panel.vercel.app
- **Backend**: https://debate-processor-production.up.railway.app (or your Railway URL)
- **Vercel Dashboard**: https://vercel.com/kbadingers-projects/debate-panel
- **Railway Dashboard**: https://railway.app/dashboard

---

## ⚡ Emergency Commands

### Force Redeploy Vercel:
```bash
vercel --prod --force
```

### Force Redeploy Railway:
```bash
railway up --force
```

### Check Logs:
```bash
# Vercel logs
vercel logs --follow

# Railway logs  
railway logs --follow
```

---

## 🔑 Environment Variables

### Must Update in Vercel When Railway URL Changes:
```
NEXT_PUBLIC_RAILWAY_URL=https://your-new-railway-url.railway.app
```

### Critical Variables Both Services Need:
- DATABASE_URL (Neon PostgreSQL)
- All AI API keys (OPENAI, ANTHROPIC, etc.)

---

## 🚨 If Deploy Fails

1. **Check GitHub push succeeded**
   ```bash
   git status
   git log --oneline -5
   ```

2. **Check service dashboards for errors**
   - Vercel: Build logs
   - Railway: Deploy logs

3. **Test locally first**
   ```bash
   # Frontend
   cd debate-panel && npm run build
   
   # Backend
   cd debate-processor && npm start
   ```

4. **Clear caches and retry**
   ```bash
   vercel --force
   railway restart
   ```

---

## 📱 Mobile Check
After deploy, always test on mobile:
1. Open on phone browser
2. Test a quick debate
3. Check responsive design

---

Remember: Backend must deploy first if you changed the API!








