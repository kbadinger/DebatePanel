import Stripe from 'stripe';
import { SUBSCRIPTION_PLANS, type SubscriptionPlan } from './subscription-plans';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-06-30.basil',
  typescript: true,
});

// Re-export for server-side compatibility
export { SUBSCRIPTION_PLANS, type SubscriptionPlan };