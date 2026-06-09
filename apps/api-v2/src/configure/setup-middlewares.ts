import { type NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import * as express from 'express';
import helmet from 'helmet';

import { CorrelationIdMiddleware, DeviceIdMiddleware } from '../common';
import { envs } from '../envs';

export function registerAppMiddlewares(app: NestExpressApplication): void {
  app.use((req, res, next) => {
    const isSwaggerRoute = envs.SWAGGER_ENABLED && req.path.startsWith(`/docs`);

    if (isSwaggerRoute) {
      return helmet({ contentSecurityPolicy: false })(req, res, next);
    }

    return helmet()(req, res, next);
  });

  app.use(compression());
  const correlationIdMiddleware = app.get(CorrelationIdMiddleware);
  app.use(correlationIdMiddleware.use.bind(correlationIdMiddleware));

  app.use(`/api/consumer/webhooks`, express.raw({ type: `application/json`, limit: `10mb` }));
  app.use(`/api/consumer/webhook`, express.raw({ type: `application/json`, limit: `10mb` }));

  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith(`/api/consumer/webhooks`) || req.path.startsWith(`/api/consumer/webhook`)) {
      return next();
    }

    return express.json({ limit: `10mb` })(req, res, next);
  });

  app.use(express.urlencoded({ extended: true, limit: `10mb` }));
  app.use(cookieParser(envs.SECURE_SESSION_SECRET));
  const deviceIdMiddleware = app.get(DeviceIdMiddleware);
  app.use(deviceIdMiddleware.use.bind(deviceIdMiddleware));

  app.use((req, res, next) => {
    if (envs.SWAGGER_ENABLED && (req.path === `/` || req.path === `/api`)) {
      return res.redirect(`/docs/consumer`);
    }

    return next();
  });
}
