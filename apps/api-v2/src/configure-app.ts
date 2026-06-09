import { type NestExpressApplication } from '@nestjs/platform-express';

import { registerScopedCors } from './configure/setup-cors';
import { registerAppMiddlewares } from './configure/setup-middlewares';
import { setupSwagger } from './configure/setup-swagger';
import { setupValidation } from './configure/setup-validation';
import { envs } from './envs';
import { OriginResolverService } from './shared/origin-resolver.service';

export function configureApp(app: NestExpressApplication, originResolver = app.get(OriginResolverService)): void {
  app.enableShutdownHooks();
  app.setGlobalPrefix(`api`);
  app.set(`trust proxy`, 1);
  app.set(`query parser`, `extended`);
  registerScopedCors(app, originResolver);
  registerAppMiddlewares(app);

  if (envs.SWAGGER_ENABLED) {
    setupSwagger(app);
  }

  setupValidation(app);
}
