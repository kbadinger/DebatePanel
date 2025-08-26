# Google Gemini Setup Guide

## 🔑 Getting Your Gemini API Key

1. **Go to Google AI Studio**
   - Visit: https://aistudio.google.com/
   - Sign in with your Google account

2. **Create API Key**
   - Click "Get API Key" in the top menu
   - Click "Create API Key"
   - Choose "Create API key in new project" (recommended)
   - Copy the generated key

3. **Add to Environment**
   ```bash
   # Add this line to your .env.local file:
   GEMINI_API_KEY=your_api_key_here
   ```

## 🧪 Test Your Setup

Once you've added the API key, run:
```bash
npx tsx scripts/test-gemini.ts
```

This will:
- Discover all available Gemini models
- Test each model for functionality
- Show you which models to add to your config

## 📊 Expected Models

You should see models like:
- `gemini-2.0-flash-exp` - Latest experimental
- `gemini-1.5-pro` - Most capable
- `gemini-1.5-flash` - Faster, cost-effective
- `gemini-1.5-flash-8b` - Lightweight version

## 💰 Pricing

Google Gemini offers:
- **Free tier**: 15 requests per minute
- **Pay-as-you-go**: Very competitive pricing
- **Rate limits**: Generous for development

## 🔧 After Setup

1. Run the test script to discover models
2. Add working models to `lib/models/config.ts`
3. Update pricing in `lib/models/pricing.ts`
4. Test in debates!

## 🚨 Troubleshooting

**"API key not found"**
- Check `.env.local` file exists in project root
- Verify the key is named `GEMINI_API_KEY`
- No quotes around the key value

**"403 Forbidden"**
- Enable the Generative AI API in Google Cloud Console
- Check your API key permissions

**"Quota exceeded"**
- You've hit the free tier limits
- Wait for reset or upgrade to paid tier

## 📝 Current Status

- ✅ GPT-5 models configured
- ✅ Claude 4 models configured  
- ✅ Grok 4 models configured
- ⏳ **Gemini models pending API key setup**

Add your Gemini API key to unlock Google's latest models!




