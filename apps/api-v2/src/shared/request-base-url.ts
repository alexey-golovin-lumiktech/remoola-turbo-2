import type express from 'express';

function getHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value.find((entry) => typeof entry === `string` && entry.trim().length > 0)?.trim();
  }

  return typeof value === `string` && value.trim().length > 0 ? value.trim() : undefined;
}

export function resolveRequestBaseUrl(req: express.Request): string | undefined {
  const forwardedProto = getHeaderValue(req.headers[`x-forwarded-proto`]);
  const forwardedHost = getHeaderValue(req.headers[`x-forwarded-host`]);
  const host = forwardedHost ?? getHeaderValue(req.headers.host) ?? req.get(`host`)?.trim();

  if (!host) return undefined;

  const protocol = forwardedProto?.split(`,`)[0]?.trim() || req.protocol || (req.secure ? `https` : `http`);

  return `${protocol}://${host}`;
}
