# xAI Grok 4 Access Guide

## Overview
Grok 4 is xAI's latest flagship model with advanced reasoning, native tool use, and real-time search integration. However, it requires a special subscription beyond just an API key.

## Subscription Tiers

### Standard API Access (What you probably have now)
- **Cost**: Pay-per-use API pricing
- **Access**: grok-beta, grok-2-1212
- **How to get**: Create account at https://console.x.ai/ and generate API key

### SuperGrok Subscription
- **Cost**: $30/month or $300/year
- **Access**: 
  - Grok 4 core model
  - 256,000 token context window
  - Advanced reasoning capabilities
  - Real-time web search integration
- **How to get**: Upgrade via X Premium+ subscription

### SuperGrok Heavy Subscription
- **Cost**: $300/month or $3,000/year
- **Access**:
  - Everything in SuperGrok
  - Grok 4 Heavy (multi-agent version)
  - Parallel tool use
  - Early access to new features
  - Priority processing
- **How to get**: Special enterprise tier

## How to Get Grok 4 Access

### Option 1: Through X Premium+ (Recommended)
1. Go to X (Twitter) and upgrade to X Premium+
2. Navigate to the Grok section in X
3. Upgrade to SuperGrok ($30/month)
4. Generate API key from https://console.x.ai/

### Option 2: Direct xAI Console
1. Visit https://console.x.ai/
2. Sign in with your X account
3. Navigate to Billing/Subscriptions
4. Choose SuperGrok or SuperGrok Heavy plan
5. Generate API key with `chat:write` permissions

### Option 3: Alternative Providers
Some third-party services offer Grok 4 access:
- CometAPI
- Various AI aggregator platforms
- Note: These may have different pricing/limitations

## API Key Configuration

Once you have a SuperGrok subscription:

1. Generate API key at https://console.x.ai/
2. Add to your `.env.local`:
```env
XAI_API_KEY=xai-your-key-here
```

3. Update model registry to mark Grok 4 as available:
```json
{
  "id": "grok-4",
  "apiName": "grok-4",
  "displayName": "Grok 4",
  "category": "premium",
  "deprecated": false,
  "verified": true
}
```

## Cost Considerations

### SuperGrok ($30/month)
- Worth it if you need:
  - Real-time information
  - Advanced reasoning
  - Tool use capabilities
  - Large context window (256k tokens)

### SuperGrok Heavy ($300/month)
- Worth it if you need:
  - Multi-agent capabilities
  - Parallel processing
  - Enterprise-level performance
  - Heavy computational tasks

## Current Limitations

Without a SuperGrok subscription, you only have access to:
- `grok-beta`: Basic model from November 2024
- `grok-2-1212`: December 2024 release

These models are good but lack:
- Real-time web search
- Native tool use
- Advanced reasoning of Grok 3/4
- Large context windows

## Recommendation

For DebatePanel use cases:
1. **Start with standard API** (grok-beta) to test
2. **Upgrade to SuperGrok** ($30/month) if you need:
   - Better debate quality
   - Real-time information
   - More sophisticated reasoning
3. **Consider SuperGrok Heavy** only for enterprise/heavy usage

## Testing Without Subscription

To test if Grok 4 would be valuable:
1. Use grok-beta in debates
2. Compare results with GPT-4o and Claude
3. If you find limitations, consider upgrading

## Integration Steps After Subscription

1. Update `.env.local` with new API key
2. Run `npm run manage-models update`
3. Verify Grok 4 appears in available models
4. Test with a simple debate

## Support Resources

- xAI Documentation: https://developers.x.ai/
- xAI Console: https://console.x.ai/
- X Premium Support: Through X app
- Community: X/Twitter discussions about Grok


