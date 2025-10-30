import { VersioningType } from '@nestjs/common';
import { type INestApplication, type RequestHandler } from '@nestjs/common/interfaces';
import { NestFactory, Reflector } from '@nestjs/core';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, type SwaggerCustomOptions, SwaggerModule } from '@nestjs/swagger';
import { default as cookieParser } from 'cookie-parser';
import * as express from 'express';

import { parsedEnvs } from '@remoola/env';

import { AppModule } from './app.module';
import { LoggingInterceptor, ResponseTransformInterceptor, HttpExceptionFilter } from './common';
import { SharedModule } from './shared/shared.module';
import { V1Module } from './v1/v1.module';
import { V2Module } from './v2/v2.module';
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: {
      origin: true,
      credentials: true,
      exposedHeaders: [`Set-Cookie`],
    },
  });
  app.setGlobalPrefix(`api`);
  app.set(`query parser`, `extended`);
  app.use(express.json({ limit: `25mb` }));
  app.use(express.urlencoded({ extended: true, limit: `25mb` }));
  app.use(cookieParser(parsedEnvs.SECURE_SESSION_SECRET));

  const versionsConfig = [
    {
      version: `1`,
      module: V1Module,
      description: `<a href="/docs/v2" style="color:#93c5fd">Switch to Remoola API v2</a>`,
    },
    {
      version: `2`,
      module: V2Module,
      description: `<a href="/docs/v1" style="color:#93c5fd">Switch to Remoola API v1</a>`,
    },
  ];

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: versionsConfig.map((x) => x.version),
  });

  app.useGlobalInterceptors(
    new LoggingInterceptor(), //
    new ResponseTransformInterceptor(app.get(Reflector)),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const setupSwagger = ({ version, module, description }: (typeof versionsConfig)[0]) => {
    const title = `Remoola API v${version}`;
    const config = new DocumentBuilder() //
      .setTitle(title)
      .setVersion(version)
      .setDescription(description)
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      include: [module, SharedModule], // ✅ this is crucial
      deepScanRoutes: true,
      autoTagControllers: true,
    });

    const json: RequestHandler = (_req, res) => res.send(document);
    app.getHttpAdapter().get(`/api-json/v${version}`, json);

    const options: SwaggerCustomOptions = { customSiteTitle: title };
    SwaggerModule.setup(`docs/v${version}`, app, document, options);
  };
  const docs: RequestHandler = (_req, res) => res.redirect(301, `/docs/v1`);
  app.getHttpAdapter().get(`/`, docs);
  versionsConfig.forEach((params) => setupSwagger(params));

  const info = (appUrl: string) => {
    versionsConfig.forEach(({ version }) => {
      const api = `${appUrl}/api/v${version}`;
      const swagger = `${appUrl}/docs/v${version}`;
      console.debug(`🚀 API v${version}: "${api}", Swagger: "${swagger}"`);
    });
  };
  await app
    .listen(parsedEnvs.PORT)
    .then(() => (console.log(``), app.getUrl()))
    .then(info);

  return app;
}

void bootstrap()
  .then(killAppWithGrace)
  .catch((e) => console.error(String(e) || `Bootstrap err`));

function killAppWithGrace(app: INestApplication) {
  async function exitHandler(options: { cleanup?: boolean; exit?: boolean }, exitCode?: number) {
    await app.close();

    if (options.cleanup) console.log(`App stopped: clean`);
    if (exitCode || exitCode === 0) console.log(`App stopped: exit code: ${exitCode}`);
    setTimeout(() => process.exit(1), 5000);
    process.exit(0);
  }

  process.stdin.resume();
  process.on(`unhandledRejection`, (error: Error | any) => {
    if (error.code == `ERR_HTTP_HEADERS_SENT`)
      return console.log(`ERR_HTTP_HEADERS_SENT with error code: ${error.code}`);
    console.error({ error, caller: bootstrap.name, message: `Unhandled rejection` });
    process.exit(1);
  });
  process.on(`exit`, exitHandler.bind(null, { cleanup: true }));
  process.on(`SIGINT`, exitHandler.bind(null, { exit: true }));
  process.on(`SIGUSR1`, exitHandler.bind(null, { exit: true }));
  process.on(`SIGUSR2`, exitHandler.bind(null, { exit: true }));
  process.on(`uncaughtException`, exitHandler.bind(null, { exit: true }));
}
