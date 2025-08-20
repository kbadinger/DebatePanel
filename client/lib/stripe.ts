import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-06-30.basil',
  typescript: true,
});

// Subscription plans configuration
export const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Free Trial',
    description: 'Get started with $5 in credits',
    price: 0,
    monthlyCredits: 5,
    features: [
      'Access to all 35+ AI models',
      'Up to 10 debates per month',
      'Basic support',
      'Export debate results'
    ]
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for individuals',
    price: 19,
    monthlyCredits: 25,
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID,
    features: [
      'Everything in Free',
      '$25 monthly credits',
      'Unused credits roll over (up to $50)',
      'Priority support',
      'API access'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Professional',
    description: 'For power users',
    price: 49,
    monthlyCredits: 75,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
    features: [
      'Everything in Starter',
      '$75 monthly credits',
      'Unused credits roll over (up to $150)',
      'Advanced analytics',
      'Custom debate templates',
      'Priority support'
    ]
  },
  teams: {
    id: 'teams',
    name: 'Teams',
    description: 'For organizations',
    price: 199,
    monthlyCredits: 350,
    stripePriceId: process.env.STRIPE_TEAMS_PRICE_ID,
    features: [
      'Everything in Pro',
      '$350 monthly credits',
      'Unused credits roll over (up to $700)',
      'Team collaboration',
      'Admin dashboard',
      'SSO integration',
      'Dedicated support'
    ]
  }
};

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS;