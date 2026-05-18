import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { type Request } from 'express';

export type RequestMeta = {
  ipAddress: string | null;
  userAgent: string | null;
  idempotencyKey: string | null;
};

function firstHeaderValue(value: string | string[] | undefined): string | null {
  if (typeof value === `string`) return value;
  if (Array.isArray(value)) return value[0] ?? null;
  return null;
}

export function getRequestMeta(req: Request): RequestMeta {
  const ipAddress = req.ip ?? firstHeaderValue(req.headers[`x-forwarded-for`]);

  return {
    ipAddress: typeof ipAddress === `string` ? ipAddress : null,
    userAgent: firstHeaderValue(req.headers[`user-agent`]),
    idempotencyKey: firstHeaderValue(req.headers[`idempotency-key`]),
  };
}

export const RequestMeta = createParamDecorator((_data: unknown, ctx: ExecutionContext): RequestMeta => {
  const req = ctx.switchToHttp().getRequest<Request>();
  return getRequestMeta(req);
});
