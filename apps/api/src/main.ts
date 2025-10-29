import { VersioningType } from '@nestjs/common';
import { type RequestHandler } from '@nestjs/common/interfaces';
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

    const options: SwaggerCustomOptions = {
      customSiteTitle: title,
      customJs: [
        `https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.1.3/swagger-ui-bundle.min.js`,
        `https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.1.3/swagger-ui-standalone-preset.min.js`,
      ],
      customCssUrl: [`https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.1.3/swagger-ui.min.css`],
    };
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
}

void bootstrap();
