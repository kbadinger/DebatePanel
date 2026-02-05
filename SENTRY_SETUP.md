# Sentry Setup Guide

Sentry has been integrated into both the debate-panel (Next.js) and debate-processor (Express) applications to capture errors and monitor performance.

## Quick Setup Steps

### 1. Create Sentry Account
1. Go to [sentry.io](https://sentry.io) and create an account
2. Create a new organization (or use existing)

### 2. Create Projects

You'll need TWO Sentry projects:

#### Project 1: Frontend (Next.js)
- **Platform**: Next.js
- **Project Name**: `debate-panel` (or your choice)
- Copy the **DSN** - you'll need this

#### Project 2: Backend (Node.js)
- **Platform**: Node.js / Express
- **Project Name**: `debate-processor` (or your choice)
- Copy the **DSN** - you'll need this

### 3. Configure Environment Variables

#### For debate-panel (.env.local):
```env
# Frontend Sentry (public - safe to expose)
NEXT_PUBLIC_SENTRY_DSN="https://xxx@yyy.ingest.sentry.io/zzz"

# Backend Sentry (server-side only - keep secret)
SENTRY_DSN="https://xxx@yyy.ingest.sentry.io/zzz"

# For source map uploads (optional but recommended)
SENTRY_ORG="your-org-slug"
SENTRY_PROJECT="debate-panel"
SENTRY_AUTH_TOKEN="sntrys_xxx" # Create in Sentry Settings > Auth Tokens
```

#### For debate-processor (.env):
```env
# Backend Sentry
SENTRY_DSN="https://xxx@yyy.ingest.sentry.io/zzz"
```

### 4. Get Auth Token (Optional - for Source Maps)

For better error tracking with source maps:

1. Go to Sentry Settings > Auth Tokens
2. Create new token with permissions:
   - `project:read`
   - `project:releases`
   - `org:read`
3. Add token to `SENTRY_AUTH_TOKEN` in debate-panel

## What's Already Integrated

### Frontend (debate-panel)
✅ **Client-side error tracking** - catches all React errors
✅ **Server-side error tracking** - catches API route errors
✅ **Edge runtime support** - catches edge function errors
✅ **Session Replay** - visual replay of user sessions with errors
✅ **Performance monitoring** - tracks slow API calls and renders
✅ **Source maps** - see exact code locations in production
✅ **Breadcrumbs** - user actions leading up to errors

### Backend (debate-processor)
✅ **Express error middleware** - catches all route errors
✅ **AI model failures** - tracks which models fail and why
✅ **Debate context** - includes topic, models, round number
✅ **Performance profiling** - identifies slow debate operations
✅ **Request tracking** - traces errors through entire debate flow

## Testing Sentry Integration

### Test Frontend Errors
Add a test error button to your UI:
```tsx
<button onClick={() => {
  throw new Error("Test Sentry Frontend Error");
}}>
  Test Sentry
</button>
```

### Test Backend Errors
Make an API call that triggers an error:
```bash
# Test debate-processor error
curl -X POST http://localhost:3001/api/test-error
```

Or trigger an actual debate error by using an invalid API key.

## Features You Get

### Error Alerts
- **Email notifications** when errors occur
- **Slack/Discord integration** for team alerts
- **Error frequency tracking** - know if errors are spiking

### Performance Monitoring
- **Slow API calls** - see which AI models are slow
- **Database query performance** - track Prisma slowdowns
- **Debate completion time** - monitor full debate duration

### Context & Debugging
Every error includes:
- **User ID** - who experienced the error
- **Debate ID** - which debate failed
- **Model & Provider** - which AI model caused the issue
- **Round Number** - when in the debate it failed
- **Full request data** - topic, description, config

### Session Replay (Frontend Only)
- **Video-like replay** of user sessions
- **DOM snapshots** showing what user saw
- **Console logs** from the user's browser
- **Network requests** that were made

## Dashboard & Monitoring

### Key Metrics to Watch
1. **Error Rate** - errors per minute/hour
2. **Most Common Errors** - which errors happen most
3. **Model Failure Rate** - which AI models fail most often
4. **Debate Success Rate** - % of debates that complete successfully

### Useful Sentry Features
- **Issue Grouping** - similar errors grouped together
- **Release Tracking** - compare error rates between deployments
- **User Feedback** - let users report issues directly
- **Custom Alerts** - get notified about specific error types

## Production Checklist

Before going live, ensure:

- [ ] Both projects created in Sentry
- [ ] DSN values configured in production environment
- [ ] Auth token set for source map uploads
- [ ] Sample rates configured appropriately:
  - Production: 10% trace sampling (cost optimization)
  - Development: 100% trace sampling (full debugging)
- [ ] Email alerts configured
- [ ] Team members invited to Sentry projects

## Cost Optimization

Sentry has generous free tier, but to stay within limits:

### Free Tier Limits
- **70,000 errors/month** - usually enough for small-medium apps
- **10,000 performance transactions/month** - might need tuning

### If You Hit Limits
Adjust sample rates in the config files:

**debate-panel/sentry.client.config.ts:**
```typescript
tracesSampleRate: 0.1, // 10% of requests tracked (was 1.0)
replaysSessionSampleRate: 0.01, // 1% of sessions recorded (was 0.1)
```

**debate-processor/lib/sentry.js:**
```javascript
tracesSampleRate: 0.1, // 10% of requests
profilesSampleRate: 0.1, // 10% of traces
```

## Support & Documentation

- **Sentry Docs**: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Next.js Integration**: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Node.js Integration**: https://docs.sentry.io/platforms/node/guides/express/

## Common Issues

### "Sentry not capturing errors"
- Check DSN is correct
- Verify environment variables are loaded
- Test with a manual error (`throw new Error("test")`)
- Check Sentry project is active

### "Source maps not uploading"
- Verify `SENTRY_AUTH_TOKEN` is set
- Check token has correct permissions
- Run build and check for upload logs
- Ensure `SENTRY_ORG` and `SENTRY_PROJECT` match exactly

### "Too many events"
- Lower sample rates in production
- Filter out noisy errors using `beforeSend` hook
- Ignore known issues (like ad blocker errors)

## Advanced Configuration

### Filtering Sensitive Data
Both apps are configured to automatically filter:
- Health check requests (noise reduction)
- Passwords and tokens (PII protection)
- User email addresses (optional - can enable if needed)

### Custom Context
You can add more context to errors:
```typescript
Sentry.setContext("custom", {
  featureFlag: "new-debate-ui",
  experimentGroup: "A"
});
```

### User Identification
Automatically set when user logs in:
```typescript
Sentry.setUser({
  id: user.id,
  email: user.email, // Optional
  username: user.name
});
```

---

**Note**: All Sentry configuration is already complete in the codebase. You only need to add the environment variables and Sentry will start capturing errors immediately.
