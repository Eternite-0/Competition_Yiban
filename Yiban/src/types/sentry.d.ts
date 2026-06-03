/**
 * Ambient type declaration for @sentry/react.
 * Allows the build to succeed even if the package's own types
 * are not resolvable (e.g. stale lock file in Docker build).
 */
declare module '@sentry/react' {
  export function init(options: Record<string, unknown>): void;
  export function captureException(error: unknown, hint?: Record<string, unknown>): void;
  export function captureMessage(message: string): void;
  export function setContext(name: string, context: Record<string, unknown> | null): void;
  export function browserTracingIntegration(): unknown;
  export function replayIntegration(options?: Record<string, unknown>): unknown;
  export const ErrorBoundary: React.ComponentType<{
    fallback?: React.ReactNode;
    showDialog?: boolean;
    children?: React.ReactNode;
  }>;
}
