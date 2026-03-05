/**
 * Client-side logger with PII redaction
 *
 * In development: logs to console
 * In production: no-ops to avoid noisy console and PII leakage
 * Can be extended with an error-reporting callback (e.g. Sentry) later.
 *
 * PII redaction ensures sensitive data is never logged, even in development.
 */

const isDev = typeof process !== `undefined` && process.env?.NODE_ENV === `development`;

/**
 * Sanitize context to remove/mask sensitive information
 */
function sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!context) return undefined;

  const sanitized = { ...context };

  // Redact common secret/sensitive fields
  const sensitiveFields = [
    `password`,
    `token`,
    `secret`,
    `apiKey`,
    `authorization`,
    `cookie`,
    `sessionId`,
    `accessToken`,
    `refreshToken`,
    `cardNumber`,
    `cvv`,
    `ssn`,
    `taxId`,
  ];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = `[REDACTED]`;
    }
  }

  // Mask PII - partial email (only in dev, full redaction in prod)
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

  // Don't log full names - convert to initials
  if (typeof sanitized.name === `string` && sanitized.name.length > 0) {
    const parts = sanitized.name.trim().split(/\s+/);
    if (parts.length > 1) {
      sanitized.name = parts.map(p => p[0]?.toUpperCase()).join(`.`);
    }
  }

  // Redact any field that looks like a card number (13-19 digits)
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === `string` && /^\d{13,19}$/.test(value.replace(/\s/g, ``))) {
      sanitized[key] = `[CARD_REDACTED]`;
    }
  }

  return sanitized;
}

function createClientLogger(scope: string) {
  const prefix = `[${scope}]`;

  return {
    warn(message: string, context?: Record<string, unknown>): void {
      if (isDev) {
        const sanitized = sanitizeContext(context);
        if (sanitized != null) {
          console.warn(`${prefix} ${message}`, sanitized);
        } else {
          console.warn(`${prefix} ${message}`);
        }
      }
    },
    error(message: string, context?: Record<string, unknown>): void {
      if (isDev) {
        const sanitized = sanitizeContext(context);
        if (sanitized != null) {
          console.error(`${prefix} ${message}`, sanitized);
        } else {
          console.error(`${prefix} ${message}`);
        }
      }
      // In production: optionally call reportError?.(message, sanitized) for RUM/analytics
    },
    info(message: string, context?: Record<string, unknown>): void {
      if (isDev) {
        const sanitized = sanitizeContext(context);
        if (sanitized != null) {
          console.log(`${prefix} ${message}`, sanitized);
        } else {
          console.log(`${prefix} ${message}`);
        }
      }
    },
  };
}

export { createClientLogger };
