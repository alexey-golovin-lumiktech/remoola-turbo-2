import { join } from 'path';

import { ValidationPipe } from '@nestjs/common';
import { type INestApplication } from '@nestjs/common/interfaces';
import { NestFactory, Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as ngrok from '@ngrok/ngrok';
import compression from 'compression';
import { default as cookieParser } from 'cookie-parser';
import * as express from 'express';
import helmet from 'helmet';

import { $Enums, type PrismaClient } from '@remoola/database-2';

import { AdminModule } from './admin/admin.module';
import { AppModule } from './app.module';
import { PrismaExceptionFilter, CorrelationIdMiddleware, LoggingInterceptor } from './common';
import { ConsumerModule } from './consumer/consumer.module';
import { envs } from './envs';
import { AuthGuard } from './guards';
import { TransformResponseInterceptor } from './interceptors';
import { PrismaService } from './shared/prisma.service';
import { passwordUtils } from './shared-common';

async function seed(prisma: PrismaClient): Promise<void> {
  const admins = [
    { type: $Enums.AdminType.ADMIN, email: envs.DEFAULT_ADMIN_EMAIL, password: envs.DEFAULT_ADMIN_PASSWORD },
    { type: $Enums.AdminType.SUPER, email: envs.SUPER_ADMIN_EMAIL, password: envs.SUPER_ADMIN_PASSWORD },
  ];

  const emails = admins.map((x) => x.email);
  const dbAdmins = await prisma.adminModel.findMany({ where: { email: { in: emails } } });
  for (const admin of admins) {
    for (const dbAdmin of dbAdmins) {
      if (dbAdmin.email === admin.email) {
        const valid = await passwordUtils.verifyPassword({
          password: admin.password,
          storedHash: dbAdmin.password,
          storedSalt: dbAdmin.salt,
        });
        if (!valid) {
          const { salt, hash } = await passwordUtils.hashPassword(admin.password);
          await prisma.adminModel.update({ where: { id: dbAdmin.id }, data: { password: hash, salt } });
        }
      }
    }
  }

  const lookup = [
    { fromCurrency: $Enums.CurrencyCode.USD, toCurrency: $Enums.CurrencyCode.EUR, rate: 0.95 },
    { fromCurrency: $Enums.CurrencyCode.USD, toCurrency: $Enums.CurrencyCode.JPY, rate: 1.0576 },
    { fromCurrency: $Enums.CurrencyCode.USD, toCurrency: $Enums.CurrencyCode.GBP, rate: 0.82 },
    { fromCurrency: $Enums.CurrencyCode.USD, toCurrency: $Enums.CurrencyCode.AUD, rate: 1.58 },
    { fromCurrency: $Enums.CurrencyCode.EUR, toCurrency: $Enums.CurrencyCode.USD, rate: 1.0576 },
    { fromCurrency: $Enums.CurrencyCode.EUR, toCurrency: $Enums.CurrencyCode.JPY, rate: 0.8582 },
    { fromCurrency: $Enums.CurrencyCode.EUR, toCurrency: $Enums.CurrencyCode.GBP, rate: 0.8427 },
    { fromCurrency: $Enums.CurrencyCode.EUR, toCurrency: $Enums.CurrencyCode.AUD, rate: 0.9398 },
    { fromCurrency: $Enums.CurrencyCode.JPY, toCurrency: $Enums.CurrencyCode.USD, rate: 0.0067 },
    { fromCurrency: $Enums.CurrencyCode.JPY, toCurrency: $Enums.CurrencyCode.EUR, rate: 0.0063 },
    { fromCurrency: $Enums.CurrencyCode.JPY, toCurrency: $Enums.CurrencyCode.GBP, rate: 0.4798 },
    { fromCurrency: $Enums.CurrencyCode.JPY, toCurrency: $Enums.CurrencyCode.AUD, rate: 0.3871 },
    { fromCurrency: $Enums.CurrencyCode.GBP, toCurrency: $Enums.CurrencyCode.USD, rate: 1.22 },
    { fromCurrency: $Enums.CurrencyCode.GBP, toCurrency: $Enums.CurrencyCode.EUR, rate: 1.15 },
    { fromCurrency: $Enums.CurrencyCode.GBP, toCurrency: $Enums.CurrencyCode.JPY, rate: 182.34 },
    { fromCurrency: $Enums.CurrencyCode.GBP, toCurrency: $Enums.CurrencyCode.AUD, rate: 0.4087 },
    { fromCurrency: $Enums.CurrencyCode.AUD, toCurrency: $Enums.CurrencyCode.USD, rate: 0.63 },
    { fromCurrency: $Enums.CurrencyCode.AUD, toCurrency: $Enums.CurrencyCode.JPY, rate: 94.56 },
    { fromCurrency: $Enums.CurrencyCode.AUD, toCurrency: $Enums.CurrencyCode.EUR, rate: 0.59 },
    { fromCurrency: $Enums.CurrencyCode.AUD, toCurrency: $Enums.CurrencyCode.GBP, rate: 0.52 },
  ];

  await prisma.exchangeRateModel.createMany({ data: lookup, skipDuplicates: true });
}

function linkTo(kind: `Consumer` | `Admin`) {
  const lookup = { Consumer: `/docs/consumer`, Admin: `/docs/admin` };
  return `<a rel="noopener noreferrer" target="_self" href="${lookup[kind]}" style="color:#93c5fd">
    (${kind} api)
    </a>`;
}

const opts = {
  customfavIcon: `https://avatars.githubusercontent.com/u/6936373?s=200&v=4`,
  customJs: [
    `https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.1.3/swagger-ui-bundle.js`,
    `https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.1.3/swagger-ui-bundle.min.js`,
    `https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.1.3/swagger-ui-standalone-preset.js`,
    `https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.1.3/swagger-ui-standalone-preset.min.js`,
  ],
  customCssUrl: [
    `https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.1.3/swagger-ui.css`,
    `https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.1.3/swagger-ui.min.css`,
  ],
};

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
  SwaggerModule.setup(`docs/admin`, app, adminDocument, opts);

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
  SwaggerModule.setup(`docs/consumer`, app, consumerDocument, opts);
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: {
      origin: true,
      credentials: true,
      exposedHeaders: [`set-cookie`, `content-range`, `content-type`],
    },
  });

  app.setGlobalPrefix(`api`);
  app.set(`query parser`, `extended`);
  app.use(helmet());
  app.use(compression());
  app.use(new CorrelationIdMiddleware().use);
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith(`/api/consumer/webhooks`)) return next();
    express.json({ limit: `10mb` })(req, res, next);
  });
  app.use(express.urlencoded({ extended: true, limit: `10mb` }));
  app.use(cookieParser(envs.SECURE_SESSION_SECRET));
  app.use(`/uploads`, express.static(join(process.cwd(), `uploads`)));
  app.use((req, res, next) => {
    if (req.path === `/` || req.path === `/api`) {
      return res.redirect(`/docs/consumer`);
    }
    next();
  });

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
  app.useGlobalInterceptors(new TransformResponseInterceptor(reflector), new LoggingInterceptor());
  app.useGlobalFilters(new PrismaExceptionFilter());

  const port = envs.PORT || 3000;
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
      compression: false,
      force_new_session: true,
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
