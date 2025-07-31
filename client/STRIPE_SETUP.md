# Stripe Setup Guide for DebatePanel

This guide walks you through setting up Stripe for DebatePanel's subscription system.

## Prerequisites

1. Create a Stripe account at https://stripe.com
2. Access your Stripe Dashboard at https://dashboard.stripe.com

## Step 1: Get Your API Keys

1. Go to **Developers → API keys** in your Stripe Dashboard
2. Copy your keys:
   - **Publishable key**: Starts with `pk_test_` (for test mode) or `pk_live_` (for production)
   - **Secret key**: Starts with `sk_test_` (for test mode) or `sk_live_` (for production)

3. Add to your `.env` file:
```env
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

## Step 2: Create Products and Prices

Go to **Products** in your Stripe Dashboard and create the following:

### 1. Starter Plan
- **Product name**: DebatePanel Starter
- **Description**: Perfect for individuals - $25 monthly credits with rollover
- **Price**: $19.00 USD
- **Billing period**: Monthly
- **Price ID**: Copy this ID (looks like `price_1234...`)

### 2. Professional Plan
- **Product name**: DebatePanel Professional
- **Description**: For power users - $75 monthly credits with rollover
- **Price**: $49.00 USD
- **Billing period**: Monthly
- **Price ID**: Copy this ID

### 3. Teams Plan
- **Product name**: DebatePanel Teams
- **Description**: For organizations - $350 monthly credits with team features
- **Price**: $199.00 USD
- **Billing period**: Monthly
- **Price ID**: Copy this ID

Add the price IDs to your `.env` file:
```env
STRIPE_STARTER_PRICE_ID="price_..."
STRIPE_PRO_PRICE_ID="price_..."
STRIPE_TEAMS_PRICE_ID="price_..."
```

## Step 3: Set Up Webhooks

1. Go to **Developers → Webhooks** in your Stripe Dashboard
2. Click **Add endpoint**
3. Enter your webhook URL:
   - **Local development**: Use [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward webhooks
   - **Production**: `https://yourdomain.com/api/webhook/stripe`

4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`

5. Copy the **Signing secret** (starts with `whsec_...`)
6. Add to your `.env` file:
```env
STRIPE_WEBHOOK_SECRET="whsec_..."
```

## Step 4: Configure Customer Portal

1. Go to **Settings → Billing → Customer portal** in Stripe Dashboard
2. Enable the customer portal
3. Configure settings:
   - **Features**: Enable all (customers can update payment methods, cancel, etc.)
   - **Business information**: Add your business name and support email
   - **Default redirect**: Set to `https://yourdomain.com/billing`

## Step 5: Local Development Setup

For local development, use Stripe CLI to forward webhooks:

1. Install Stripe CLI:
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows
scoop install stripe

# Linux
# Download from https://github.com/stripe/stripe-cli/releases
```

2. Login to Stripe CLI:
```bash
stripe login
```

3. Forward webhooks to your local server:
```bash
stripe listen --forward-to localhost:3000/api/webhook/stripe
```

4. The CLI will show a webhook signing secret. Update your `.env`:
```env
STRIPE_WEBHOOK_SECRET="whsec_..." # Use the CLI secret for local dev
```

## Step 6: Test Your Integration

### Test Card Numbers
Use these test cards in development:
- **Success**: 4242 4242 4242 4242
- **Requires authentication**: 4000 0025 0000 3155
- **Declined**: 4000 0000 0000 9995

### Test Flow
1. Sign up for a new account (gets $5 free credits)
2. Go to Billing page
3. Click "Upgrade" on a plan
4. Use test card 4242 4242 4242 4242
5. Complete checkout
6. Verify:
   - Subscription is active in your database
   - Credits are added to user's balance
   - Webhook events appear in Stripe Dashboard

## Step 7: Going to Production

Before going live:

1. **Switch to Live Mode** in Stripe Dashboard
2. **Update API Keys** in production `.env`:
   ```env
   STRIPE_SECRET_KEY="sk_live_..."
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
   ```

3. **Create Live Products** - Repeat Step 2 in Live mode
4. **Set Production Webhook** - Update endpoint URL to production domain
5. **Enable SSL** - Stripe requires HTTPS for production webhooks
6. **Set Environment Variables** on your hosting platform

## Environment Variables Summary

Here's a complete list for your `.env` file:

```env
# Stripe API Keys
STRIPE_SECRET_KEY="sk_test_..." # or sk_live_ for production
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..." # or pk_live_ for production

# Stripe Webhook Secret
STRIPE_WEBHOOK_SECRET="whsec_..."

# Stripe Price IDs (from your Products)
STRIPE_STARTER_PRICE_ID="price_..."
STRIPE_PRO_PRICE_ID="price_..."
STRIPE_TEAMS_PRICE_ID="price_..."

# NextAuth URL (needed for Stripe redirects)
NEXTAUTH_URL="http://localhost:3000" # or your production URL
```

## Troubleshooting

### Webhook Issues
- Check webhook logs in Stripe Dashboard under **Developers → Webhooks → [Your endpoint] → Webhook attempts**
- Ensure your webhook endpoint returns 200 status
- Verify webhook signing secret matches

### Checkout Issues
- Ensure price IDs are correct
- Check browser console for errors
- Verify publishable key is correct

### Credit Balance Issues
- Check database for subscription record
- Verify webhook events are being received
- Check UsageRecord table for proper tracking

## Support

- **Stripe Documentation**: https://stripe.com/docs
- **Stripe Support**: https://support.stripe.com
- **Test Mode**: Always test thoroughly in Test mode before going live