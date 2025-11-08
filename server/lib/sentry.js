let Sentry = null;
let isSentryEnabled = false;

function initializeSentry() {
  if (!process.env.SENTRY_DSN) {
    console.log('⚠️  Sentry DSN not configured - error tracking disabled');
    return;
  }

  try {
    // In @sentry/node v10+, use setupExpressErrorHandler instead of middleware
    Sentry = require('@sentry/node');
    const { nodeProfilingIntegration } = require('@sentry/profiling-node');

    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      environment: process.env.NODE_ENV || 'development',
      integrations: [nodeProfilingIntegration()],
      beforeBreadcrumb(breadcrumb) {
        if (breadcrumb.message && breadcrumb.message.includes('/health')) {
          return null;
        }
        return breadcrumb;
      },
    });

    isSentryEnabled = true;
    console.log('✅ Sentry initialized for error tracking');
  } catch (error) {
    console.error('Failed to initialize Sentry:', error);
    Sentry = null;
    isSentryEnabled = false;
  }
}

module.exports = {
  get Sentry() { return Sentry; },
  get isSentryEnabled() { return isSentryEnabled; },
  initializeSentry
};
