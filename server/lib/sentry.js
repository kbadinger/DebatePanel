let Sentry = null;
let isSentryEnabled = false;

function initializeSentry() {
  if (!process.env.SENTRY_DSN) {
    console.log('⚠️  Sentry DSN not configured - error tracking disabled');
    return;
  }

  try {
    Sentry = require('@sentry/node');
    const { nodeProfilingIntegration } = require('@sentry/profiling-node');

    Sentry.init({
      dsn: process.env.SENTRY_DSN,

      // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
      // We recommend adjusting this value in production
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // Set sampling rate for profiling - this is relative to tracesSampleRate
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      environment: process.env.NODE_ENV || 'development',

      integrations: [
        // Add profiling integration
        nodeProfilingIntegration(),
      ],

      // Optionally capture console logs as breadcrumbs
      beforeBreadcrumb(breadcrumb) {
        // Filter out health check noise
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
  }
}

module.exports = {
  get Sentry() { return Sentry; },
  get isSentryEnabled() { return isSentryEnabled; },
  initializeSentry
};
