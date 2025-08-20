import { NextRequest, NextResponse } from 'next/server';
import { stripe, SUBSCRIPTION_PLANS } from '@/lib/stripe';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;
  
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId;
        
        if (!userId || !planId) {
          throw new Error('Missing metadata in checkout session');
        }

        const plan = SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS];
        
        // Update subscription
        await prisma.subscription.update({
          where: { userId },
          data: {
            plan: planId,
            status: 'active',
            stripePriceId: (plan as any).stripePriceId,
            monthlyAllowance: plan.monthlyCredits,
            currentBalance: plan.monthlyCredits,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        // Find user by customer ID
        const userSubscription = await prisma.subscription.findFirst({
          where: { stripeCustomerId: customerId },
        });
        
        if (!userSubscription) {
          throw new Error('Subscription not found for customer');
        }

        // Update subscription status
        await prisma.subscription.update({
          where: { id: userSubscription.id },
          data: {
            status: subscription.status,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          },
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        // Find user by customer ID
        const userSubscription = await prisma.subscription.findFirst({
          where: { stripeCustomerId: customerId },
        });
        
        if (!userSubscription) {
          throw new Error('Subscription not found for customer');
        }

        // Downgrade to free plan
        await prisma.subscription.update({
          where: { id: userSubscription.id },
          data: {
            plan: 'free',
            status: 'active',
            stripePriceId: null,
            monthlyAllowance: 5.00,
            currentBalance: Math.min(userSubscription.currentBalance, 5.00),
            rolloverBalance: 0,
          },
        });
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const subscriptionId = invoice.subscription as string;
        
        // Find user by customer ID
        const userSubscription = await prisma.subscription.findFirst({
          where: { stripeCustomerId: customerId },
        });
        
        if (!userSubscription) {
          throw new Error('Subscription not found for customer');
        }

        const plan = SUBSCRIPTION_PLANS[userSubscription.plan as keyof typeof SUBSCRIPTION_PLANS];
        
        // Calculate rollover (max 2x monthly allowance)
        const maxRollover = plan.monthlyCredits * 2;
        const totalBalance = userSubscription.currentBalance + userSubscription.rolloverBalance;
        const newRollover = Math.min(totalBalance, maxRollover - plan.monthlyCredits);
        
        // Add monthly credits and update rollover
        await prisma.subscription.update({
          where: { id: userSubscription.id },
          data: {
            currentBalance: plan.monthlyCredits + newRollover,
            rolloverBalance: newRollover,
            rolloverExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}