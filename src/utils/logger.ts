/**
 * Nova Browser Structured Logger
 * Provides consistent, structured diagnostic logging across services and components.
 * Supports a pluggable error-reporting hook (e.g. Sentry, telemetry) so unexpected
 * failures are never silently swallowed.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type ErrorReportingHook = (
  error: unknown,
  context: { level: LogLevel; scope: string; message: string; extra?: unknown }
) => void;

let errorReportingHook: ErrorReportingHook | null = null;

/**
 * Registers an error reporting hook (e.g. Sentry.captureException).
 */
export function setErrorReportingHook(hook: ErrorReportingHook | null): void {
  errorReportingHook = hook;
}

function formatPrefix(level: LogLevel, scope: string): string {
  return `[${level.toUpperCase()}][${scope}]`;
}

export const logger = {
  debug(scope: string, message: string, extra?: unknown): void {
    if (import.meta.env?.DEV) {
      if (extra !== undefined) {
        console.debug(formatPrefix('debug', scope), message, extra);
      } else {
        console.debug(formatPrefix('debug', scope), message);
      }
    }
  },

  info(scope: string, message: string, extra?: unknown): void {
    if (extra !== undefined) {
      console.info(formatPrefix('info', scope), message, extra);
    } else {
      console.info(formatPrefix('info', scope), message);
    }
  },

  warn(scope: string, message: string, errorOrExtra?: unknown): void {
    console.warn(formatPrefix('warn', scope), message, errorOrExtra ?? '');
    if (errorReportingHook) {
      try {
        errorReportingHook(errorOrExtra, { level: 'warn', scope, message, extra: errorOrExtra });
      } catch {
        // Prevent telemetry errors from disrupting the main app loop
      }
    }
  },

  error(scope: string, message: string, error?: unknown): void {
    console.error(formatPrefix('error', scope), message, error ?? '');
    if (errorReportingHook) {
      try {
        errorReportingHook(error, { level: 'error', scope, message, extra: error });
      } catch {
        // Prevent telemetry errors from disrupting the main app loop
      }
    }
  }
};
