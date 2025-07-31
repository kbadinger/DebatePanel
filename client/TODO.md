# DebatePanel - Development TODO List

## 🔐 Authentication & User Management

### 1. User Authentication
- [ ] Implement NextAuth.js with providers:
  - [ ] Email/Password (with email verification)
  - [ ] Google OAuth
  - [ ] GitHub OAuth
  - [ ] Microsoft OAuth (for enterprise)
- [ ] Create login page with social options
- [ ] Create signup page with terms acceptance
- [ ] Implement password reset flow
- [ ] Add 2FA support (optional)
- [ ] Session management and JWT tokens
- [ ] Remember me functionality

### 2. User Profile Management
- [ ] Profile page with editable information
- [ ] Avatar upload functionality
- [ ] Email preferences (notifications)
- [ ] API key management view (show which providers are active)
- [ ] Account deletion with data export
- [ ] Change password functionality
- [ ] Login history and active sessions

## 💳 Payment & Subscription System

### 1. Stripe Integration
- [ ] Set up Stripe customer portal
- [ ] Implement subscription creation
- [ ] Handle payment method updates
- [ ] Process webhook events:
  - [ ] payment_intent.succeeded
  - [ ] customer.subscription.updated
  - [ ] customer.subscription.deleted
  - [ ] invoice.payment_failed
- [ ] Implement retry logic for failed payments
- [ ] Set up Stripe Tax for automatic tax calculation

### 2. Subscription Management Page
- [ ] Current plan display with usage
- [ ] Upgrade/downgrade flow
- [ ] Cancel subscription flow
- [ ] Pause subscription option
- [ ] Payment history table
- [ ] Download invoices/receipts
- [ ] Update payment method
- [ ] Apply coupon code interface

### 3. Pricing Page
- [ ] Beautiful pricing table component
- [ ] Feature comparison matrix
- [ ] Annual vs monthly toggle
- [ ] Currency selector (USD, EUR, GBP)
- [ ] "Most Popular" badge on Pro plan
- [ ] Testimonials section
- [ ] FAQ section
- [ ] Enterprise "Contact Us" option

### 4. Coupon System
- [ ] Database schema for coupons:
  ```sql
  Coupon {
    code: string (unique)
    description: string
    discountType: 'percentage' | 'fixed'
    discountAmount: float
    validFrom: DateTime
    validUntil: DateTime
    maxUses: int
    currentUses: int
    restrictToPlan: string[]
    firstTimeOnly: boolean
    active: boolean
  }
  ```
- [ ] Coupon validation API endpoint
- [ ] Apply coupon during checkout
- [ ] Show discount in subscription details
- [ ] Track coupon usage analytics
- [ ] Bulk coupon generation for campaigns

## 👨‍💼 Admin Dashboard

### 1. User Management
- [ ] User list with search/filter/sort
- [ ] User details view:
  - [ ] Profile information
  - [ ] Subscription status
  - [ ] Usage statistics
  - [ ] Payment history
  - [ ] Debate history
- [ ] Actions:
  - [ ] Suspend/unsuspend user
  - [ ] Adjust balance manually
  - [ ] Send email to user
  - [ ] Impersonate user (for support)
  - [ ] Export user data
- [ ] Bulk actions (export, email, suspend)

### 2. Financial Dashboard
- [ ] Revenue metrics:
  - [ ] MRR (Monthly Recurring Revenue)
  - [ ] ARR (Annual Recurring Revenue)
  - [ ] ARPU (Average Revenue Per User)
  - [ ] Churn rate
  - [ ] LTV (Lifetime Value)
- [ ] Charts:
  - [ ] Revenue over time
  - [ ] New vs churned customers
  - [ ] Plan distribution
  - [ ] Payment failure rate
- [ ] Cohort analysis
- [ ] Revenue forecasting

### 3. Usage Analytics
- [ ] Platform-wide metrics:
  - [ ] Total debates run
  - [ ] Token usage by model
  - [ ] Average debate cost
  - [ ] Peak usage times
- [ ] Model popularity rankings
- [ ] User behavior patterns
- [ ] Cost vs revenue analysis
- [ ] Alert for unusual usage patterns

### 4. System Administration
- [ ] Model pricing management:
  - [ ] Update token costs
  - [ ] Adjust platform markup
  - [ ] Enable/disable models
  - [ ] Add new models
- [ ] Feature flags management
- [ ] System health monitoring
- [ ] API key rotation interface
- [ ] Maintenance mode toggle
- [ ] Announcement banner system

### 5. Support Tools
- [ ] User search by email/ID
- [ ] Debate inspection tool
- [ ] Usage adjustment interface
- [ ] Refund processing
- [ ] Support ticket integration
- [ ] Canned responses for common issues

## 🔧 Backend Requirements

### 1. API Endpoints
- [ ] `/api/auth/*` - Authentication endpoints
- [ ] `/api/user/*` - User management
- [ ] `/api/subscription/*` - Subscription management
- [ ] `/api/payment/*` - Payment processing
- [ ] `/api/admin/*` - Admin endpoints (protected)
- [ ] `/api/coupon/*` - Coupon validation
- [ ] `/api/usage/*` - Usage tracking

### 2. Database Migrations
- [ ] Add indexes for performance:
  - [ ] userId + createdAt on UsageRecord
  - [ ] email on User
  - [ ] stripeCustomerId on Subscription
- [ ] Add audit log table
- [ ] Add support ticket table
- [ ] Add feature flags table

### 3. Background Jobs
- [ ] Daily usage rollup job
- [ ] Monthly billing cycle job
- [ ] Expired rollover cleanup
- [ ] Failed payment retry
- [ ] Usage alert emails
- [ ] Monthly usage reports

### 4. Security
- [ ] Rate limiting on all endpoints
- [ ] CSRF protection
- [ ] Input validation with Zod
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] Secure session management
- [ ] API endpoint authorization
- [ ] Admin role verification

## 📧 Email System

### 1. Transactional Emails
- [ ] Welcome email on signup
- [ ] Email verification
- [ ] Password reset
- [ ] Payment successful
- [ ] Payment failed
- [ ] Subscription cancelled
- [ ] Usage warning (80% of limit)
- [ ] Monthly usage summary

### 2. Email Templates
- [ ] Use React Email for templates
- [ ] Consistent branding
- [ ] Mobile responsive
- [ ] Dark mode support
- [ ] Unsubscribe links
- [ ] Plain text alternatives

## 🚀 Launch Checklist

### 1. Legal
- [ ] Terms of Service
- [ ] Privacy Policy
- [ ] Cookie Policy
- [ ] GDPR compliance
- [ ] CCPA compliance
- [ ] Age verification (13+)

### 2. SEO & Marketing
- [ ] Landing page optimization
- [ ] Meta tags and OG images
- [ ] Sitemap generation
- [ ] robots.txt
- [ ] Google Analytics
- [ ] Conversion tracking
- [ ] A/B testing setup

### 3. Monitoring
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring
- [ ] Uptime monitoring
- [ ] Cost alerts
- [ ] Security scanning
- [ ] Backup verification

### 4. Documentation
- [ ] API documentation
- [ ] User guides
- [ ] Video tutorials
- [ ] FAQ section
- [ ] Troubleshooting guide
- [ ] Admin manual

## 🎯 Future Features

### Phase 2
- [ ] Team workspaces
- [ ] Debate templates library
- [ ] API access for developers
- [ ] Webhook integrations
- [ ] Export to various formats
- [ ] Debate scheduling
- [ ] Public debate sharing

### Phase 3
- [ ] Mobile app
- [ ] Browser extension
- [ ] Slack/Discord integration
- [ ] Custom model fine-tuning
- [ ] White-label solution
- [ ] Enterprise SSO
- [ ] Advanced analytics API

## 📝 Notes

### Priority Order
1. Authentication (can't do anything without users)
2. Payment system (need to collect money)
3. Basic admin dashboard (need to support users)
4. Email system (critical for auth and payments)
5. Advanced admin features
6. Future features

### Tech Stack Decisions
- **Auth**: NextAuth.js (most flexible)
- **Payments**: Stripe (industry standard)
- **Email**: Resend or SendGrid
- **Admin UI**: Shadcn UI + custom components
- **Background Jobs**: Vercel Cron or Trigger.dev
- **Monitoring**: Vercel Analytics + Sentry

### Development Time Estimates
- Authentication: 2-3 days
- Payment System: 3-4 days
- Admin Dashboard: 5-7 days
- Email System: 2 days
- Testing & Polish: 3-4 days
- **Total**: ~3 weeks for MVP

### Cost Considerations
- Stripe: 2.9% + $0.30 per transaction
- Email service: ~$20-50/month
- Monitoring: ~$20-50/month
- Additional infrastructure: ~$50-100/month