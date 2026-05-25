import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

import { newUuid } from '@remoola/security-utils';

export interface RequestWithCorrelationId extends Request {
  correlationId: string;
}

const CORRELATION_ID_MAX_LENGTH = 128;
const CORRELATION_ID_SAFE_PATTERN = /^[A-Za-z0-9._:-]+$/;

function normalizeCorrelationId(raw: unknown): string {
  if (typeof raw !== `string`) return newUuid();
  const value = raw.trim();
  if (!value || value.length > CORRELATION_ID_MAX_LENGTH) return newUuid();
  if (!CORRELATION_ID_SAFE_PATTERN.test(value)) return newUuid();
  return value;
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: RequestWithCorrelationId, res: Response, next: NextFunction) {
    const correlationId = normalizeCorrelationId(req.headers[`x-correlation-id`]);
    req.correlationId = correlationId;
    res.setHeader(`x-correlation-id`, correlationId);
    next();
  }
}
