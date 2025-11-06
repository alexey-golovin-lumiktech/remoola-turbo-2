import { ValidationPipe } from '@nestjs/common';
import { type INestApplication, type RequestHandler } from '@nestjs/common/interfaces';
import { NestFactory, Reflector } from '@nestjs/core';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, type SwaggerCustomOptions, SwaggerModule } from '@nestjs/swagger';
import { default as cookieParser } from 'cookie-parser';
import * as express from 'express';

import { parsedEnvs } from '@remoola/env';

import { AdminModule } from './admin/admin.module';
import { AppModule } from './app.module';
import { AuthModule } from './auth/auth.module';
import { ConsumerModule } from './consumer/consumer.module';

function setupSwagger(app: any) {
  const adminConfig = new DocumentBuilder()
    .setTitle(`Remoola Admin API`)
    .setDescription(
      `API documentation for Admin area <a href="/docs/consumer" style="color:#93c5fd">Switch to Consumer area</a>`,
    )
    .setVersion(`1.0`)
    .addBearerAuth()
    .build();

  const adminDocument = SwaggerModule.createDocument(app, adminConfig, {
    include: [AuthModule, AdminModule],
  });
  SwaggerModule.setup(`docs/admin`, app, adminDocument);

  const consumerConfig = new DocumentBuilder()
    .setTitle(`Remoola Consumer API`)
    .setDescription(
      `API documentation for Consumer area <a href="/docs/admin" style="color:#93c5fd">Switch to Admin area</a>`,
    )
    .setVersion(`1.0`)
    .addBearerAuth()
    .build();

  const consumerDocument = SwaggerModule.createDocument(app, consumerConfig, {
    include: [AuthModule, ConsumerModule],
  });
  SwaggerModule.setup(`docs/consumer`, app, consumerDocument);
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: {
      origin: true,
      credentials: true,
      exposedHeaders: [`Set-Cookie`, `Content-Range`, `Content-Type`],
    },
  });

  app.set(`query parser`, `extended`);
  app.use(express.json({ limit: `25mb` }));
  app.use(express.urlencoded({ extended: true, limit: `25mb` }));
  app.use(cookieParser(parsedEnvs.SECURE_SESSION_SECRET));

  app.setGlobalPrefix(`api`);
  setupSwagger(app);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = 3333;
  await app
    .listen(port)
    .then(app.getUrl)
    .then((appUrl) => {
      console.log(`🚀 API running on ${appUrl}/api`);
      console.log(`📘 Admin Docs → ${appUrl}/docs/admin`);
      console.log(`📗 Consumer Docs → ${appUrl}/docs/consumer`);
    });

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
