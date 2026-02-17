import { randomUUID } from 'crypto';

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export interface RequestWithCorrelationId extends Request {
  correlationId: string;
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: RequestWithCorrelationId, res: Response, next: NextFunction) {
    const correlationId = (req.headers[`x-correlation-id`] as string) || randomUUID();
    req.correlationId = correlationId;
    res.setHeader(`x-correlation-id`, correlationId);
    next();
  }
}
