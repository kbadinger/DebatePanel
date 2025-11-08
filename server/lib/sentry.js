let Sentry = null;
let sentryHandlers = null;
let isSentryEnabled = false;

function initializeSentry() {
  if (!process.env.SENTRY_DSN) {
    console.log('⚠️  Sentry DSN not configured - error tracking disabled');
    return;
  }

  try {
    const SentryNode = require('@sentry/node');
    Sentry = SentryNode;
    const { nodeProfilingIntegration } = require('@sentry/profiling-node');

    console.log('Sentry keys:', Object.keys(SentryNode).slice(0, 10));

    SentryNode.init({
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

    // In @sentry/node v8+, handlers are exported as named exports, not on the main object
    // Try both patterns for compatibility
    if (SentryNode.Handlers) {
      sentryHandlers = SentryNode.Handlers;
      console.log('Using Sentry.Handlers (old pattern)');
    } else {
      // Import handlers separately for newer versions
      const handlers = require('@sentry/node');
      sentryHandlers = {
        requestHandler: handlers.requestHandler || handlers.Handlers?.requestHandler,
        tracingHandler: handlers.tracingHandler || handlers.Handlers?.tracingHandler,
        errorHandler: handlers.errorHandler || handlers.Handlers?.errorHandler
      };
      console.log('Using named exports pattern, handlers available:', {
        requestHandler: !!sentryHandlers.requestHandler,
        tracingHandler: !!sentryHandlers.tracingHandler,
        errorHandler: !!sentryHandlers.errorHandler
      });
    }

    if (sentryHandlers && sentryHandlers.requestHandler) {
      isSentryEnabled = true;
      console.log('✅ Sentry initialized for error tracking');
    } else {
      console.error('❌ Could not find Sentry handlers');
      Sentry = null;
      sentryHandlers = null;
    }
  } catch (error) {
    console.error('Failed to initialize Sentry:', error);
    Sentry = null;
    isSentryEnabled = false;
  }
}

module.exports = {
  get Sentry() { return Sentry; },
  get Handlers() { return sentryHandlers; },
  get isSentryEnabled() { return isSentryEnabled; },
  initializeSentry
};
