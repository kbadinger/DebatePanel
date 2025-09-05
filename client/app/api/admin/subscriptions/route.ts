import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { PrismaClient } from '@prisma/client';
import { stripe } from '@/lib/stripe';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const planFilter = searchParams.get('plan') || '';
    const statusFilter = searchParams.get('status') || '';

    // Build where clause for filtering
    const where: any = {};
    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      };
    }
    if (planFilter) {
      where.plan = planFilter;
    }
    if (statusFilter) {
      where.status = statusFilter;
    }

    // Get total count for pagination
    const total = await prisma.subscription.count({ where });

    // Fetch subscriptions with user data
    const subscriptions = await prisma.subscription.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    // Enrich with Stripe data
    const enrichedSubscriptions = await Promise.all(
      subscriptions.map(async (sub) => {
        let stripeData = null;
        if (sub.stripeCustomerId) {
          try {
            // Get Stripe customer data
            const customer = await stripe.customers.retrieve(sub.stripeCustomerId);
            
            // Get active subscriptions
            const stripeSubscriptions = await stripe.subscriptions.list({
              customer: sub.stripeCustomerId,
              status: 'all',
              limit: 1
            });

            // Get recent invoices
            const invoices = await stripe.invoices.list({
              customer: sub.stripeCustomerId,
              limit: 3
            });

            stripeData = {
              customer: customer,
              subscription: stripeSubscriptions.data[0] || null,
              recentInvoices: invoices.data,
              hasPaymentMethod: customer.deleted ? false : (customer as any).invoice_settings?.default_payment_method ? true : false
            };
          } catch (error) {
            console.error(`Failed to fetch Stripe data for customer ${sub.stripeCustomerId}:`, error);
          }
        }

        return {
          ...sub,
          stripeData
        };
      })
    );

    return NextResponse.json({
      subscriptions: enrichedSubscriptions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Admin subscriptions fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscriptionId, updates } = await req.json();
    
    if (!subscriptionId || !updates) {
      return NextResponse.json(
        { error: 'Subscription ID and updates are required' },
        { status: 400 }
      );
    }

    // Get current subscription
    const currentSub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { user: true }
    });

    if (!currentSub) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Update local subscription
    const updatedSub = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        ...updates,
        updatedAt: new Date()
      },
      include: { user: true }
    });

    // If plan changed and has Stripe customer, update Stripe
    if (updates.plan && updates.plan !== currentSub.plan && currentSub.stripeCustomerId) {
      try {
        const stripeSubscriptions = await stripe.subscriptions.list({
          customer: currentSub.stripeCustomerId,
          status: 'active',
          limit: 1
        });

        if (stripeSubscriptions.data[0] && updates.stripePriceId) {
          await stripe.subscriptions.update(stripeSubscriptions.data[0].id, {
            items: [{
              id: stripeSubscriptions.data[0].items.data[0].id,
              price: updates.stripePriceId,
            }],
          });
        }
      } catch (stripeError) {
        console.error('Failed to update Stripe subscription:', stripeError);
        // Continue anyway - local update succeeded
      }
    }

    return NextResponse.json({ subscription: updatedSub });
  } catch (error) {
    console.error('Admin subscription update error:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
}