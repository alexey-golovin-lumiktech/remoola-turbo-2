import { type INestApplication, type RequestHandler } from '@nestjs/common/interfaces';
import { NestFactory } from '@nestjs/core';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, type SwaggerCustomOptions, SwaggerModule } from '@nestjs/swagger';
import { default as cookieParser } from 'cookie-parser';
import * as express from 'express';

import { parsedEnvs } from '@remoola/env';

import { AdminModule } from './admin/admin.module';
import { AppModule } from './app.module';
import { ConsumerModule } from './consumer/consumer.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: {
      origin: true,
      credentials: true,
      exposedHeaders: [`Set-Cookie`, `Content-Range`, `Content-Type`],
    },
  });
  app.setGlobalPrefix(`api`);
  app.set(`query parser`, `extended`);
  app.use(express.json({ limit: `25mb` }));
  app.use(express.urlencoded({ extended: true, limit: `25mb` }));
  app.use(cookieParser(parsedEnvs.SECURE_SESSION_SECRET));

  const title = `Remoola API (from WireBill)`;
  const config = new DocumentBuilder() //
    .setTitle(title)
    .addBearerAuth(
      {
        type: `http`,
        scheme: `bearer`,
        bearerFormat: `JWT`,
        description: `Enter JWT token`,
      },
      `jwt`, // This is a unique name for your security scheme
    )
    .setDescription(`description`)
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    include: [AppModule, AdminModule, ConsumerModule], // ✅ this is crucial
    deepScanRoutes: true,
    autoTagControllers: true,
  });

  const json: RequestHandler = (_req, res) => res.send(document);
  app.getHttpAdapter().get(`/api-json`, json);

  const options: SwaggerCustomOptions = { customSiteTitle: title };
  SwaggerModule.setup(`docs`, app, document, options);
  const docs: RequestHandler = (_req, res) => res.redirect(301, `/docs`);
  app.getHttpAdapter().get(`/`, docs);

  await app.listen(5000).then(() => (console.log(``), app.getUrl()));

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
