/**
 * Server-side structured logger for consumer-mobile
 *
 * GOVERNANCE EXEMPTION: This file is an approved logger abstraction layer.
 * console.* usage is permitted ONLY within this logger implementation.
 * All application code MUST use this logger instead of direct console calls.
 *
 * Governance compliance:
 * - 01 §7 - Logging & Observability (approved abstraction)
 * - 06 §11.1 - No console.log in app code (this IS the logger)
 * - 06 §11.2 - Carry correlation id through request lifecycle
 * - 05 §4.5 - Never log secrets; redact tokens/credentials; mask PII
 * - 05 §8 - No internal stack traces leaked to clients
 *
 * Use this logger instead of console.* for all server-side logging
 */

import { randomUUID } from 'crypto';

type LogLevel = `debug` | `info` | `warn` | `error`;

interface LogContext {
  [key: string]: unknown;
  correlationId?: string;
  userId?: string;
  error?: Error | unknown;
  stack?: string;
}

class ServerLogger {
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  private sanitizeContext(context?: LogContext): LogContext | undefined {
    if (!context) return undefined;

    const sanitized = { ...context };

    // Redact common secret fields
    const secretFields = [`password`, `token`, `secret`, `apiKey`, `authorization`];
    for (const field of secretFields) {
      if (field in sanitized) {
        sanitized[field] = `[REDACTED]`;
      }
    }

    // Mask PII - partial email
    if (typeof sanitized.email === `string`) {
      const email = sanitized.email;
      const [local, domain] = email.split(`@`);
      if (local && domain) {
        sanitized.email = `${local.slice(0, 2)}***@${domain}`;
      }
    }

    // Mask PII - partial phone
    if (typeof sanitized.phone === `string`) {
      const phone = sanitized.phone;
      sanitized.phone = phone.length > 4 ? `***${phone.slice(-4)}` : `***`;
    }

    // Extract error details safely
    if (sanitized.error instanceof Error) {
      sanitized.errorMessage = sanitized.error.message;
      sanitized.errorName = sanitized.error.name;
      sanitized.stack = sanitized.error.stack;
      delete sanitized.error;
    }

    return sanitized;
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const sanitizedContext = this.sanitizeContext(context);

    const logEntry = {
      timestamp,
      level,
      service: this.serviceName,
      message,
      ...sanitizedContext,
    };

    // In production, this would send to a logging service (Sentry, DataDog, etc.)
    // For now, use console with structured format for development
    const logString = JSON.stringify(logEntry);

    switch (level) {
      case `error`:
        console.error(logString);
        break;
      case `warn`:
        console.warn(logString);
        break;
      case `info`:
        console.info(logString);
        break;
      case `debug`:
        console.debug(logString);
        break;
    }
  }

  debug(message: string, context?: LogContext) {
    this.log(`debug`, message, context);
  }

  info(message: string, context?: LogContext) {
    this.log(`info`, message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log(`warn`, message, context);
  }

  error(message: string, context?: LogContext) {
    this.log(`error`, message, context);
  }

  /**
   * Log an action/mutation attempt with correlation ID
   * Use for financial operations per governance 05 §4.4
   */
  auditLog(
    action: string,
    context: {
      actor?: string;
      userId?: string;
      entityId?: string;
      correlationId?: string;
      idempotencyKey?: string;
      [key: string]: unknown;
    },
  ) {
    this.info(`[AUDIT] ${action}`, {
      ...context,
      correlationId: context.correlationId ?? randomUUID(),
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Generate a correlation ID for tracking requests
 */
export function generateCorrelationId(): string {
  return randomUUID();
}

/**
 * Server logger instance for consumer-mobile
 *
 * Usage:
 * ```typescript
 * import { serverLogger, generateCorrelationId } from '@/lib/logger.server';
 *
 * const correlationId = generateCorrelationId();
 * serverLogger.info('Payment started', { paymentId, amount, correlationId });
 * serverLogger.error('Payment failed', { error, paymentId, correlationId });
 *
 * // For audit trail (financial operations):
 * serverLogger.auditLog('PAYMENT_INITIATED', {
 *   userId: user.id,
 *   entityId: paymentId,
 *   amount,
 *   correlationId,
 * });
 * ```
 */
export const serverLogger = new ServerLogger(`consumer-mobile`);
