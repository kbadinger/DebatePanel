'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { SUBSCRIPTION_PLANS } from '@/lib/stripe';
import { formatCost } from '@/lib/models/pricing';
import { Button } from '@/components/ui/button';
import { Check, Zap, CreditCard } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface SubscriptionData {
  plan: string;
  status: string;
  currentBalance: number;
  monthlyAllowance: number;
  rolloverBalance: number;
  currentPeriodEnd: string;
}

export default function BillingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/billing');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchSubscription();
    }
  }, [session]);

  const fetchSubscription = async () => {
    try {
      const response = await fetch('/api/subscription');
      const data = await response.json();
      setSubscription(data);
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    setUpgrading(planId);
    
    try {
      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      
      const { sessionId } = await response.json();
      const stripe = await stripePromise;
      
      if (stripe) {
        const { error } = await stripe.redirectToCheckout({ sessionId });
        if (error) {
          console.error('Stripe redirect error:', error);
        }
      }
    } catch (error) {
      console.error('Failed to start checkout:', error);
    } finally {
      setUpgrading(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/subscription/portal', {
        method: 'POST',
      });
      
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Failed to open customer portal:', error);
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const currentPlan = subscription?.plan || 'free';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Choose Your Plan</h1>
          <p className="text-xl text-slate-600">
            Get AI-powered insights for better decisions
          </p>
        </div>

        {/* Current Subscription Status */}
        {subscription && (
          <div className="max-w-2xl mx-auto mb-12 bg-white rounded-xl shadow-lg p-6 border border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Current Subscription</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-600">Plan</p>
                <p className="text-lg font-semibold capitalize">{subscription.plan}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Current Balance</p>
                <p className="text-lg font-semibold">{formatCost(subscription.currentBalance)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Monthly Credits</p>
                <p className="text-lg font-semibold">{formatCost(subscription.monthlyAllowance)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Rollover Balance</p>
                <p className="text-lg font-semibold">{formatCost(subscription.rolloverBalance)}</p>
              </div>
            </div>
            {currentPlan !== 'free' && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-slate-600 mb-2">
                  Next billing date: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
                <Button onClick={handleManageSubscription} variant="secondary">
                  <CreditCard className="mr-2" size={16} />
                  Manage Subscription
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => {
            const isCurrentPlan = currentPlan === key;
            const isUpgrade = currentPlan === 'free' || 
              (currentPlan === 'starter' && (key === 'pro' || key === 'teams')) ||
              (currentPlan === 'pro' && key === 'teams');
            
            return (
              <div
                key={key}
                className={`relative bg-white rounded-xl shadow-lg p-6 border-2 transition-all ${
                  isCurrentPlan 
                    ? 'border-blue-500 shadow-blue-100' 
                    : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Current Plan
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                  <p className="text-sm text-slate-600 mb-4">{plan.description}</p>
                  <div className="text-3xl font-bold text-slate-900">
                    ${plan.price}
                    <span className="text-base font-normal text-slate-600">/month</span>
                  </div>
                  <p className="text-sm text-blue-600 mt-1">
                    {formatCost(plan.monthlyCredits)} in credits
                  </p>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="text-green-500 mr-2 mt-0.5" size={16} />
                      <span className="text-sm text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {key === 'free' && !session ? (
                  <Button className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : isCurrentPlan ? (
                  <Button className="w-full" disabled variant="secondary">
                    Current Plan
                  </Button>
                ) : isUpgrade ? (
                  <Button 
                    className="w-full" 
                    onClick={() => handleUpgrade(key)}
                    disabled={upgrading === key}
                  >
                    {upgrading === key ? 'Processing...' : 'Upgrade'}
                    <Zap className="ml-2" size={16} />
                  </Button>
                ) : (
                  <Button className="w-full" variant="secondary" disabled>
                    Not Available
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mt-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow">
              <h3 className="font-semibold text-slate-900 mb-2">How do credits work?</h3>
              <p className="text-slate-600">
                Credits are used to pay for AI model usage. Each debate costs between $0.10 - $2.00 
                depending on the models and number of rounds you choose.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow">
              <h3 className="font-semibold text-slate-900 mb-2">Do unused credits roll over?</h3>
              <p className="text-slate-600">
                Yes! On paid plans, unused credits roll over to the next month up to 2x your monthly allowance. 
                Free trial credits do not roll over.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow">
              <h3 className="font-semibold text-slate-900 mb-2">Can I cancel anytime?</h3>
              <p className="text-slate-600">
                Absolutely. You can cancel your subscription at any time from the billing portal. 
                You&apos;ll continue to have access until the end of your billing period.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}