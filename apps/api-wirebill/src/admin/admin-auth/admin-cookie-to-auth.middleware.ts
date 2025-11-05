import { Injectable, NestMiddleware } from '@nestjs/common';
import * as express from 'express';

@Injectable()
export class AdminCookieToAuthMiddleware implements NestMiddleware {
  use(req: express.Request, _res: express.Response, next: express.NextFunction) {
    console.log(`\n************************************`);
    console.log(`req.cookies`, req.cookies);
    console.log(`************************************\n`);
    if (!req.headers.authorization) {
      const token = req.cookies?.accessToken;
      if (token) req.headers.authorization = `Bearer ${token}`;
    }
    next();
  }
}
