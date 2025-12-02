import { join } from 'path';

import { ValidationPipe } from '@nestjs/common';
import { type INestApplication } from '@nestjs/common/interfaces';
import { NestFactory, Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as ngrok from '@ngrok/ngrok';
import { default as cookieParser } from 'cookie-parser';
import * as express from 'express';

import { $Enums, type PrismaClient } from '@remoola/database';
import { parsedEnvs } from '@remoola/env';

import { AdminModule } from './admin/admin.module';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { ConsumerModule } from './consumer/consumer.module';
import { envs } from './envs';
import { AuthGuard } from './guards';
import { TransformResponseInterceptor } from './interceptors';
import { PrismaService } from './shared/prisma.service';
import { type IAdminCreate, passwordUtils } from './shared-common';
async function seed(prisma: PrismaClient): Promise<void> {
  const admins = [
    { type: $Enums.AdminType.ADMIN, email: `regular.admin@wirebill.com`, password: `RegularWirebill@Admin123!` },
    { type: $Enums.AdminType.SUPER, email: `super.admin@wirebill.com`, password: `SuperWirebill@Admin123!` },
    { type: $Enums.AdminType.SUPER, email: `email@email.com`, password: `password` },
  ];

  const emails = admins.map((x) => x.email);
  await prisma.adminModel.deleteMany({ where: { email: { in: emails } } });

  const data: IAdminCreate[] = [];
  for (const admin of admins) {
    const { salt, hash } = await passwordUtils.hashPassword(admin.password);
    data.push({ email: admin.email, type: admin.type, salt: salt, password: hash });
  }
  await prisma.adminModel.createMany({ data, skipDuplicates: true });
}

function linkTo(kind: `Consumer` | `Admin`) {
  const lookup = { Consumer: `/docs/consumer`, Admin: `/docs/admin` };
  return `<a rel="noopener noreferrer" target="_self" href="${lookup[kind]}" style="color:#93c5fd">
    (${kind} api)
    </a>`;
}

function setupSwagger(app: any) {
  const adminConfig = new DocumentBuilder()
    .addBasicAuth({ type: `http`, scheme: `basic` }, `basic`)
    .addBearerAuth({ type: `http`, scheme: `bearer` }, `bearer`)
    .setTitle(`Remoola Admin API`)
    .setDescription(`Admin API ${linkTo(`Consumer`)}`)
    .setVersion(`1.0`)
    .addBearerAuth()
    .build();

  const adminDocument = SwaggerModule.createDocument(app, adminConfig, {
    include: [AdminModule],
    deepScanRoutes: true,
  });
  SwaggerModule.setup(`docs/admin`, app, adminDocument);

  const consumerConfig = new DocumentBuilder()
    .addBasicAuth({ type: `http`, scheme: `basic` }, `basic`)
    .addBearerAuth({ type: `http`, scheme: `bearer` }, `bearer`)
    .setTitle(`Remoola Consumer API`)
    .setDescription(`Consumer API ${linkTo(`Admin`)}`)
    .setVersion(`1.0`)
    .addBearerAuth()
    .build();

  const consumerDocument = SwaggerModule.createDocument(app, consumerConfig, {
    include: [ConsumerModule],
    deepScanRoutes: true,
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
  app.use(`/consumer/webhooks`, express.raw({ type: `application/json` }));
  app.use(`/uploads`, express.static(join(process.cwd(), `uploads`)));

  app.setGlobalPrefix(`api`);
  setupSwagger(app);
  app.useGlobalPipes(
    new ValidationPipe({
      skipMissingProperties: true,
      skipNullProperties: true,
      skipUndefinedProperties: true,
      stopAtFirstError: true,
      transform: true,
      transformOptions: {
        excludeExtraneousValues: true,
        exposeUnsetFields: false,
        enableImplicitConversion: true,
        exposeDefaultValues: false,
      },
    }),
  );

  const reflector = app.get(Reflector);
  const jwtService = app.get(JwtService);
  const prisma = app.get(PrismaService);
  await seed(prisma);
  app.useGlobalGuards(new AuthGuard(reflector, jwtService, prisma));
  app.useGlobalInterceptors(new TransformResponseInterceptor(reflector));
  app.useGlobalFilters(new PrismaExceptionFilter());

  const port = 3333;
  await app
    .listen(port)
    .then(app.getUrl)
    .then((appUrl) => {
      console.log(`🚀 API running on ${appUrl}/api`);
      console.log(`📘 Admin Docs → ${appUrl}/docs/admin`);
      console.log(`📗 Consumer Docs → ${appUrl}/docs/consumer`);
    });

  if (envs.NGROK_AUTH_TOKEN !== `NGROK_AUTH_TOKEN` && envs.NGROK_DOMAIN !== `NGROK_DOMAIN`) {
    const listener = await ngrok.forward({
      addr: port,
      authtoken: envs.NGROK_AUTH_TOKEN,
      domain: envs.NGROK_DOMAIN,
    });

    console.log(`Ingress ngrok established at: ${listener.url()}`);
  }

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
