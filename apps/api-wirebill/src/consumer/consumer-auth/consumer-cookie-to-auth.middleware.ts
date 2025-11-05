import { Injectable, NestMiddleware } from '@nestjs/common';
import * as express from 'express';

@Injectable()
export class ConsumerCookieToAuthMiddleware implements NestMiddleware {
  use(req: express.Request, _res: express.Response, next: express.NextFunction) {
    if (!req.headers.authorization) {
      const token = req.cookies?.accessToken;
      if (token) req.headers.authorization = `Bearer ${token}`;
    }
    next();
  }
}
