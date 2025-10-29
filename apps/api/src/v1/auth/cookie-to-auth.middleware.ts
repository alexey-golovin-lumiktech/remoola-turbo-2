import { Injectable, NestMiddleware } from '@nestjs/common';
import * as express from 'express';

@Injectable()
export class CookieToAuthMiddleware implements NestMiddleware {
  use(req: express.Request, _res: express.Response, next: express.NextFunction) {
    if (!req.headers.authorization) {
      const token = req.cookies?.access_token;
      if (token) req.headers.authorization = `Bearer ${token}`;
    }
    next();
  }
}
