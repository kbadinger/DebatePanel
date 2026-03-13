// Subscription plans configuration - safe for client-side import
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
    description: 'For teams and power users',
    price: 49,
    monthlyCredits: 75,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
    features: [
      'Everything in Starter',
      '$75 monthly credits',
      'Unused credits roll over (up to $150)',
      'Advanced analytics',
      'Custom templates',
      'Team collaboration'
    ]
  },
  teams: {
    id: 'teams',
    name: 'Teams',
    description: 'For large organizations',
    price: 199,
    monthlyCredits: 350,
    stripePriceId: process.env.STRIPE_TEAMS_PRICE_ID,
    features: [
      'Everything in Professional',
      '$350 monthly credits',
      'Unused credits roll over (up to $700)',
      'SSO integration',
      'Dedicated support',
      'Custom branding',
      'Advanced team management'
    ]
  }
} as const;

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS;