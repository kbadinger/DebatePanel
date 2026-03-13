# Public Release Security Review - DebatePanel

## CRITICAL - Must fix before going public

### Submodule (`debate-panel/`) - tracked in git:
- [ ] **Remove `credentials/gmail-obsidian-sync-6b582b757ce8.json`** — Google Cloud service account private key is committed and tracked. Must remove from repo AND scrub from git history.
- [ ] **Remove `TEST_USERS.md`** — Contains test user emails, passwords, user IDs. Tracked in git.

### Parent repo (`DebatePanel/`) - tracked in git:
- [ ] **Remove `DEBUG_PRODUCTION_LOGIN.md`** — Contains production debug steps, Vercel project URLs, admin passwords, DB query patterns. Tracked in git.
- [ ] **Remove `.mcp.json`** — Contains **real API keys** for Brave, Perplexity, xAI, OpenRouter, and TickTick OAuth credentials. **This is tracked in git.**
- [ ] **Remove `.claude/settings.local.json`** — Contains permission config. Tracked in git. (Less critical but shouldn't be public)

### Files on disk but NOT tracked (safe from git, but verify):
- `.env`, `.env.local`, `.env.production` — contain real production API keys (OpenAI, Anthropic, Stripe live keys, DB creds, etc.) — **.gitignore is correctly excluding these** ✅

### Git history scrub (BOTH repos):
- [ ] **Scrub `credentials/` from submodule git history** — The private key was added in commit `14c776f` and lives in history even after file removal
- [ ] **Scrub `.mcp.json` from parent repo git history** — API keys are in commit history

### After scrub:
- [ ] **Revoke ALL exposed keys**: Google Cloud service account, Brave API key, Perplexity API key, xAI API key, OpenRouter API key, TickTick OAuth credentials
- [ ] **Generate new replacement keys** for all revoked credentials

---

## HIGH - Should fix before going public

- [ ] **Remove API key logging in `lib/cost-reconciliation.ts:329-331`** — Logs first 20 chars and last 10 chars of Anthropic admin key
- [ ] **Add to `.gitignore` in parent repo**: `.mcp.json`, `.claude/`
- [ ] **Add to `.gitignore` in submodule**: `credentials/`

---

## MEDIUM - Nice to do before going public

- [ ] Add a LICENSE file (MIT, Apache 2.0, etc.)
- [ ] Improve README.md (currently just "Run ./test_local.sh to start everything and test")
- [ ] Add `.env.example` to parent repo
- [ ] Review personal info references (`kbadinger@resolventtech.com`, etc.) — decide if intentional branding
- [ ] Consider removing internal planning docs from parent repo: `DECISIONFORGE-DEBATEPANEL-PLAN.md`, `STATUS.md`, `debate-monetization.md`, `app-revenue-debate.md`, `read_receipt_calibration_spec.md`, `SENTRY_SETUP.md`, `DEPLOYMENT_GUIDE.md`, `DEPLOY_QUICK_REFERENCE.md`

---

## Review
(To be filled after work is complete)
