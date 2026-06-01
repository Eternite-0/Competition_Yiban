import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry error reporting.
 * Reads DSN from VITE_SENTRY_DSN env var; skips init if not set.
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    console.info('[Sentry] DSN not configured, error reporting disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE, // 'development' | 'production'
    release: import.meta.env.VITE_APP_VERSION || 'unknown',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Performance monitoring: sample 10% of transactions in prod, 100% in dev
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    // Session replay: sample 10% of sessions, 100% on errors
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    // Only report errors from allowed origins
    allowUrls: [window.location.origin],
    // Ignore common noisy errors
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
    ],
    beforeSend(event) {
      // Strip sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((bc) => {
          if (bc.data?.url && typeof bc.data.url === 'string') {
            // Remove token from URL query params
            bc.data.url = bc.data.url.replace(/([?&])token=[^&]*/gi, '$1token=[REDACTED]');
          }
          return bc;
        });
      }
      return event;
    },
  });
}
