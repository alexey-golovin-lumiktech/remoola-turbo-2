import { type NextResponse } from 'next/server';

const AUTH_TELEMETRY_HEADERS_FLAG = `NEXT_PUBLIC_AUTH_TELEMETRY_HEADERS`;

export type RefreshScope = `auth_page` | `protected_page`;
export type RefreshOutcome = `success` | `http_error` | `network_error` | `unavailable`;

export interface RefreshAttemptTelemetry {
  scope: RefreshScope;
  outcome: RefreshOutcome;
  latencyMs: number;
  statusCode?: number;
}

export function appendServerTiming(existingServerTiming: string | null, metric: string): string {
  return existingServerTiming ? `${existingServerTiming}, ${metric}` : metric;
}

export function applyRefreshTelemetry(res: NextResponse, telemetry: RefreshAttemptTelemetry): NextResponse {
  const verboseTelemetryHeadersEnabled = process.env[AUTH_TELEMETRY_HEADERS_FLAG] === `true`;
  if (verboseTelemetryHeadersEnabled) {
    res.headers.set(`x-remoola-auth-refresh-attempted`, `1`);
    res.headers.set(`x-remoola-auth-refresh-scope`, telemetry.scope);
    res.headers.set(`x-remoola-auth-refresh-outcome`, telemetry.outcome);
    res.headers.set(`x-remoola-auth-refresh-latency-ms`, String(telemetry.latencyMs));
    if (typeof telemetry.statusCode === `number`) {
      res.headers.set(`x-remoola-auth-refresh-status`, String(telemetry.statusCode));
    }
    if (telemetry.latencyMs >= 3000) {
      res.headers.set(`x-remoola-auth-refresh-slow`, `1`);
    }
  }

  const metric = `auth_refresh;dur=${telemetry.latencyMs};desc="${telemetry.scope}:${telemetry.outcome}"`;
  res.headers.set(`server-timing`, appendServerTiming(res.headers.get(`server-timing`), metric));
  return res;
}
