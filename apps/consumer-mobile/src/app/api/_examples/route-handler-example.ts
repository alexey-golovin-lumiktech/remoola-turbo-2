/**
 * Example route handler with proper logging and error handling
 *
 * This demonstrates the pattern for API route handlers following governance rules.
 * Use this as a template for new route handlers in consumer-mobile.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getEnv } from '../../../lib/env.server';
import { generateCorrelationId, serverLogger } from '../../../lib/logger.server';

// Define your schema
const requestSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().min(3).max(3),
  recipientId: z.string().min(1),
});

/**
 * POST /api/example-payment
 *
 * Example endpoint showing proper error handling, logging, and user-safe responses.
 */
export async function POST(req: Request) {
  const correlationId = generateCorrelationId();

  try {
    // 1. Parse request body
    const body = await req.json().catch(() => null);

    // 2. Validate input
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      serverLogger.warn(`API validation failed`, {
        correlationId,
        errors: parsed.error.flatten(),
      });

      return NextResponse.json(
        {
          code: `VALIDATION_ERROR`,
          message: `Please check your input and try again`,
          fields: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    // 3. Check config
    const env = getEnv();
    if (!env.NEXT_PUBLIC_API_BASE_URL) {
      serverLogger.error(`API base URL not configured`, { correlationId });
      return NextResponse.json(
        {
          code: `CONFIG_ERROR`,
          message: `Service temporarily unavailable`,
        },
        { status: 503 },
      );
    }

    // 4. Audit log for financial operations
    serverLogger.auditLog(`PAYMENT_INITIATED`, {
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      recipientId: parsed.data.recipientId,
      correlationId,
    });

    // 5. Make backend API call
    const apiRes = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/consumer/payments`, {
      method: `POST`,
      headers: {
        'Content-Type': `application/json`,
        'X-Correlation-ID': correlationId,
        // Forward auth cookies
        Cookie: req.headers.get(`cookie`) ?? ``,
      },
      body: JSON.stringify(parsed.data),
      cache: `no-store`,
    });

    // 6. Handle API errors
    if (!apiRes.ok) {
      const errorData = await apiRes.json().catch(() => ({}));

      serverLogger.error(`Backend API error`, {
        correlationId,
        status: apiRes.status,
        errorCode: errorData.code,
        errorMessage: errorData.message,
      });

      // Map status codes to user-friendly messages
      const statusMessages: Record<number, { code: string; message: string }> = {
        400: { code: `VALIDATION_ERROR`, message: `Invalid payment details` },
        401: { code: `UNAUTHORIZED`, message: `Your session has expired. Please sign in again.` },
        403: { code: `FORBIDDEN`, message: `You do not have permission to perform this action` },
        404: { code: `NOT_FOUND`, message: `The requested resource was not found` },
        409: { code: `CONFLICT`, message: `This payment has already been processed` },
        429: { code: `RATE_LIMIT_EXCEEDED`, message: `Too many attempts. Please try again later.` },
        500: { code: `API_ERROR`, message: `Unable to process payment. Please try again.` },
        503: { code: `API_ERROR`, message: `Service temporarily unavailable` },
      };

      const statusResponse = statusMessages[apiRes.status] ?? {
        code: `API_ERROR`,
        message: `Unable to complete request`,
      };

      return NextResponse.json(
        {
          code: errorData.code ?? statusResponse.code,
          message: errorData.message ?? statusResponse.message,
        },
        { status: apiRes.status },
      );
    }

    // 7. Success response
    const data = await apiRes.json();

    serverLogger.info(`Payment completed successfully`, {
      correlationId,
      paymentId: data.id,
    });

    return NextResponse.json(
      {
        ok: true,
        data,
        correlationId, // Include for support/debugging
      },
      { status: 200 },
    );
  } catch (error) {
    // 8. Catch-all error handler
    serverLogger.error(`Unexpected API exception`, {
      correlationId,
      error,
      errorMessage: error instanceof Error ? error.message : `Unknown error`,
    });

    // Never expose internal errors to users
    return NextResponse.json(
      {
        code: `INTERNAL_ERROR`,
        message: `Something went wrong. Please try again.`,
        correlationId, // Include for support
      },
      { status: 500 },
    );
  }
}

/**
 * Optional: Add other HTTP methods
 */
export async function GET() {
  const correlationId = generateCorrelationId();

  serverLogger.info(`Example GET request`, { correlationId });

  return NextResponse.json(
    {
      message: `Use POST method for this endpoint`,
      correlationId,
    },
    {
      status: 405,
    },
  );
}

/**
 * Notes for implementation:
 *
 * 1. ALWAYS generate correlation ID at the start
 * 2. ALWAYS validate input before processing
 * 3. ALWAYS use audit logging for financial operations
 * 4. ALWAYS catch and log errors
 * 5. NEVER expose internal errors to users
 * 6. NEVER log PII without redaction (serverLogger does this automatically)
 * 7. ALWAYS forward correlation ID to backend APIs
 * 8. ALWAYS return consistent error format
 * 9. ALWAYS use appropriate HTTP status codes
 * 10. ALWAYS set cache: 'no-store' for authenticated/personalized endpoints
 */
