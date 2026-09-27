/**
 * Nova Browser Structured Logger
 * Provides consistent, structured diagnostic logging across services and components.
 * Warnings and errors are always written to the console so failures are never
 * silently swallowed.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

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
  },

  error(scope: string, message: string, error?: unknown): void {
    console.error(formatPrefix('error', scope), message, error ?? '');
  }
};
