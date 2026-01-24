import { type NextRequest, NextResponse } from 'next/server';

export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
}

export function handleApiError(error: unknown): NextResponse<ApiError> {
  console.error(`API Error:`, error);

  if (error instanceof Error) {
    // Check for specific error types
    if (error.message.includes(`fetch`)) {
      return NextResponse.json(
        {
          message: `Failed to connect to backend service`,
          code: `BACKEND_UNAVAILABLE`,
        },
        { status: 503 },
      );
    }

    if (error.message.includes(`timeout`)) {
      return NextResponse.json(
        {
          message: `Request timed out`,
          code: `TIMEOUT`,
        },
        { status: 408 },
      );
    }

    // Check if it's our custom error format
    const customError = error as any;
    if (customError.statusCode) {
      return NextResponse.json(
        {
          message: error.message,
          code: customError.code,
        },
        { status: customError.statusCode },
      );
    }

    return NextResponse.json(
      {
        message: error.message,
        code: `INTERNAL_ERROR`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      message: `An unexpected error occurred`,
      code: `UNKNOWN_ERROR`,
    },
    { status: 500 },
  );
}

export async function proxyApiRequest(
  backendUrl: string,
  req: NextRequest,
  options: {
    timeout?: number;
    retries?: number;
  } = {},
): Promise<NextResponse> {
  const { timeout = 30000, retries = 2 } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(backendUrl, {
        method: req.method,
        headers: new Headers(req.headers),
        credentials: `include`,
        signal: controller.signal,
        ...(req.method !== `GET` &&
          req.method !== `HEAD` && {
            body: req.body,
          }),
      });

      clearTimeout(timeoutId);

      // Clone the response to get headers and body
      const responseClone = response.clone();
      const cookie = response.headers.get(`set-cookie`);

      let body: string;
      try {
        body = await responseClone.text();
      } catch {
        body = ``;
      }

      const headers: Record<string, string> = {};
      if (cookie) headers[`set-cookie`] = cookie;

      return new NextResponse(body, {
        status: response.status,
        headers,
      });
    } catch (error) {
      lastError = error;

      // Don't retry on client errors (4xx)
      if (error instanceof Response && error.status >= 400 && error.status < 500) {
        break;
      }

      // Wait before retrying (exponential backoff)
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  throw lastError;
}
