# Resend.com Email Setup Guide

This guide walks you through setting up Resend.com for DebatePanel's email functionality (password resets, welcome emails, notifications).

## Step 1: Create Resend Account

1. Go to [Resend.com](https://resend.com) and create an account
2. Verify your email address
3. Complete the onboarding process

## Step 2: Domain Setup (Production)

### For Production Domain:
1. In Resend Dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `debatepanel.com`)
4. Add the required DNS records to your domain provider:
   - **SPF Record**: Add to your DNS
   - **DKIM Records**: Add the provided CNAME records
   - **DMARC Record**: Add the suggested DMARC policy

### For Development/Testing:
You can use Resend's shared sending domain initially, but emails may go to spam.

## Step 3: Get API Key

1. In Resend Dashboard, go to **API Keys**
2. Click **Create API Key**
3. Give it a name (e.g., "DebatePanel Production" or "DebatePanel Development")
4. Select permissions:
   - **Emails**: Send
   - **Domains**: Read (if using custom domain)
5. Copy the API key (starts with `re_...`)

## Step 4: Configure Environment Variables

Add to your `.env` file:

```env
# Resend Email Configuration
RESEND_API_KEY="re_..."
EMAIL_FROM="DebatePanel <noreply@yourdomain.com>"
EMAIL_REPLY_TO="support@yourdomain.com"
```

### Email Address Format:
- **With Custom Domain**: `"DebatePanel <noreply@debatepanel.com>"`
- **Development/Shared Domain**: `"DebatePanel <noreply@resend.dev>"`

## Step 5: Test Email Functionality

### Test Password Reset:
1. Start your development server: `npm run dev`
2. Go to `/forgot-password`
3. Enter a test email address
4. Check the console for the reset link (in development)
5. Check your Resend dashboard for email delivery status

### Test Welcome Email:
1. Create a new account via `/signup`
2. Check the Resend dashboard for email delivery
3. Verify email formatting and content

## Step 6: Production Checklist

Before going live:

### Domain Verification
- [ ] Custom domain added to Resend
- [ ] DNS records configured and verified
- [ ] SPF, DKIM, and DMARC records active
- [ ] Test email from custom domain

### Email Templates
- [ ] Welcome email tested and formatted correctly
- [ ] Password reset email tested and links work
- [ ] All email addresses use your custom domain

### Security
- [ ] API key is production key (not test key)
- [ ] Environment variables set on hosting platform
- [ ] Rate limiting enabled for email endpoints

## Step 7: Monitor and Maintain

### Monitoring:
- Check Resend dashboard for delivery rates
- Monitor bounce and complaint rates
- Watch for any delivery issues

### Best Practices:
- Keep bounce rates under 5%
- Monitor spam complaint rates
- Maintain good domain reputation
- Don't send emails to invalid addresses

## Troubleshooting

### Common Issues:

#### Emails going to spam:
- Verify domain DNS records are correct
- Check domain reputation
- Ensure consistent "From" address
- Consider domain warming for new domains

#### API errors:
- Verify API key is correct and has proper permissions
- Check Resend dashboard for error details
- Ensure rate limits aren't exceeded

#### Development testing:
- Use `console.log` fallback when Resend is not configured
- Test with real email addresses in development
- Check network connectivity to Resend API

### Environment Variable Summary:

```env
# Required for email functionality
RESEND_API_KEY="re_..." # From Resend dashboard

# Optional (with sensible defaults)
EMAIL_FROM="DebatePanel <noreply@yourdomain.com>" # Your sending address
EMAIL_REPLY_TO="support@yourdomain.com" # Support email for replies
```

## Current Email Features:

### ✅ Implemented:
- **Password Reset**: Secure token-based password reset with 1-hour expiration
- **Welcome Email**: Sent automatically on user signup with feature overview
- **Graceful Fallbacks**: Development console logging when email is not configured
- **Professional Templates**: HTML and text versions with DebatePanel branding

### 🔄 Future Enhancements:
- Low credit balance notifications
- Monthly usage summaries
- Subscription renewal reminders
- Debate result sharing via email

## Support

- **Resend Documentation**: https://resend.com/docs
- **Resend Support**: https://resend.com/support
- **DNS Help**: Most domain providers have guides for adding email DNS records

## Cost Expectations

Resend pricing (as of January 2025):
- **Free Tier**: 3,000 emails/month
- **Pro**: $20/month for 50,000 emails
- **Business**: $85/month for 200,000 emails

For most SaaS applications, the free tier covers initial usage well.