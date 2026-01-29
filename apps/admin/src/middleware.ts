import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = [`/login`, `/api/auth/login`];
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// Token validation cache to avoid repeated backend calls
const tokenCache = new Map<string, { valid: boolean; expires: number }>();
const TOKEN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function validateToken(token: string): Promise<boolean> {
  // Check cache first
  const cached = tokenCache.get(token);
  if (cached && Date.now() < cached.expires) {
    return cached.valid;
  }

  try {
    // Create cookie header to send to backend
    const cookieHeader = `access_token=${token}`;

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: `GET`,
      headers: {
        'Content-Type': `application/json`,
        Cookie: cookieHeader,
      },
      credentials: `include`,
      // Short timeout for middleware
      signal: AbortSignal.timeout(5000),
    });

    const isValid = response.ok;
    tokenCache.set(token, { valid: isValid, expires: Date.now() + TOKEN_CACHE_TTL });

    return isValid;
  } catch (error) {
    console.error(`Token validation failed:`, error);
    return false;
  }
}

async function refreshToken(refreshToken: string): Promise<{ accessToken?: string; success: boolean }> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: `POST`,
      headers: {
        'Content-Type': `application/json`,
      },
      body: JSON.stringify({ refreshToken }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return { success: false };
    }

    const data = await response.json();
    return {
      accessToken: data.accessToken,
      success: true,
    };
  } catch (error) {
    console.error(`Token refresh failed:`, error);
    return { success: false };
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Get tokens from cookies
  const accessToken = req.cookies.get(`access_token`)?.value;
  const refreshTokenValue = req.cookies.get(`refresh_token`)?.value;

  // For protected routes, require authentication
  if (!pathname.startsWith(`/api/`)) {
    if (!accessToken) {
      return redirectToLogin(req);
    }

    // Validate access token
    const isValidToken = await validateToken(accessToken);
    if (!isValidToken) {
      // Try to refresh token
      if (refreshTokenValue) {
        const refreshResult = await refreshToken(refreshTokenValue);
        if (refreshResult.success && refreshResult.accessToken) {
          // Set new access token and continue
          const response = NextResponse.next();
          response.cookies.set(`access_token`, refreshResult.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === `production`,
            sameSite: `strict`,
            maxAge: 15 * 60, // 15 minutes
          });
          return response;
        }
      }

      // Token refresh failed, redirect to login
      return redirectToLogin(req);
    }

    // Authenticated user accessing root path - redirect to dashboard
    if (pathname === `/`) {
      const url = req.nextUrl.clone();
      url.pathname = `/dashboard`;
      return NextResponse.redirect(url);
    }
  }

  // For API routes, just check if token exists (detailed validation happens in API handlers)
  if (pathname.startsWith(`/api/`) && !accessToken) {
    return NextResponse.json({ error: `Authentication required`, code: `AUTH_REQUIRED` }, { status: 401 });
  }

  return NextResponse.next();
}

function redirectToLogin(req: NextRequest): NextResponse {
  const url = req.nextUrl.clone();
  url.pathname = `/login`;
  const intended = req.nextUrl.pathname === `/` ? `/dashboard` : req.nextUrl.pathname;
  url.searchParams.set(`next`, intended);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    `/((?!_next/static|_next/image|favicon.ico).*)`,
  ],
};
