import { join } from 'path';

import { ValidationPipe, Logger } from '@nestjs/common';
import { type INestApplication } from '@nestjs/common/interfaces';
import { NestFactory, Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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
import { NgrokIngressService } from './infrastructure/ngrok/ngrok-ingress.service';
import { TransformResponseInterceptor } from './interceptors';
import { PrismaService } from './shared/prisma.service';
import { passwordUtils } from './shared-common';

const logger = new Logger(`Bootstrap`);

const DB_CONNECT_MAX_ATTEMPTS = 30;
const DB_CONNECT_DELAY_MS = 500;

async function waitForDatabase(prisma: PrismaClient): Promise<void> {
  for (let attempt = 1; attempt <= DB_CONNECT_MAX_ATTEMPTS; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      if (attempt > 1) logger.log(`Database ready after ${attempt} attempt(s)`);
      return;
    } catch (e) {
      if (attempt === DB_CONNECT_MAX_ATTEMPTS) throw e;
      logger.warn(
        `Database not ready (attempt ${attempt}/${DB_CONNECT_MAX_ATTEMPTS}), retrying in ${DB_CONNECT_DELAY_MS}ms...`,
      );
      await new Promise((r) => setTimeout(r, DB_CONNECT_DELAY_MS));
    }
  }
}

async function seed(prisma: PrismaClient): Promise<void> {
  const admins = [
    { type: $Enums.AdminType.ADMIN, email: envs.DEFAULT_ADMIN_EMAIL, password: envs.DEFAULT_ADMIN_PASSWORD },
    { type: $Enums.AdminType.SUPER, email: envs.SUPER_ADMIN_EMAIL, password: envs.SUPER_ADMIN_PASSWORD },
  ];

  const emails = admins.map((x) => x.email);
  const dbAdmins = await prisma.adminModel.findMany({ where: { email: { in: emails } } });

  for (const admin of admins) {
    if (dbAdmins.length === 0) {
      const { salt, hash } = await passwordUtils.hashPassword(admin.password);
      await prisma.adminModel.create({
        data: {
          email: admin.email,
          password: hash,
          salt,
          type: admin.type,
        },
      });
      continue;
    }
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
  await prisma.exchangeRateModel.deleteMany({});
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

function setupSwagger(app: INestApplication) {
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
  SwaggerModule.setup(`docs/admin`, app, adminDocument, { ...opts, jsonDocumentUrl: `docs/admin-api-json` });

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
  SwaggerModule.setup(`docs/consumer`, app, consumerDocument, { ...opts, jsonDocumentUrl: `docs/consumer-api-json` });
}

async function bootstrap() {
  const allowedOrigins = new Set<string>(
    [
      envs.CONSUMER_APP_ORIGIN,
      envs.ADMIN_APP_ORIGIN,
      envs.NEST_APP_EXTERNAL_ORIGIN?.replace(/\/api\/?$/, ``),
      ...(envs.CORS_ALLOWED_ORIGINS || []),
    ]
      .filter(Boolean)
      .map((x) => String(x).replace(/\/$/, ``)),
  );

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    cors: {
      origin: (origin, callback) => {
        if (!origin) {
          // non-browser requests (health checks, server-to-server)
          callback(null, true);
          return;
        }
        const normalized = origin.replace(/\/$/, ``);
        if (allowedOrigins.has(normalized)) {
          callback(null, true);
          return;
        }
        callback(new Error(`CORS origin denied`), false);
      },
      credentials: true,
      exposedHeaders: [`set-cookie`, `content-range`, `content-type`],
    },
  });
  app.enableShutdownHooks();

  const isOnVercel = envs.VERCEL === 1;
  if (isOnVercel) process.env.NO_COLOR = `true`;

  app.setGlobalPrefix(`api`);
  app.set(`trust proxy`, 1);
  app.set(`query parser`, `extended`);
  app.use((req, res, next) => {
    const isSwagger = req.path.startsWith(`/docs`);
    if (isSwagger) return helmet({ contentSecurityPolicy: false })(req, res, next);
    return helmet()(req, res, next);
  });
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

  // Add CSP headers for Swagger routes to work with Vercel
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
  await waitForDatabase(prisma);
  await seed(prisma);
  app.useGlobalGuards(new AuthGuard(reflector, jwtService, prisma));
  app.useGlobalInterceptors(new TransformResponseInterceptor(reflector), new LoggingInterceptor());
  app.useGlobalFilters(new PrismaExceptionFilter());

  const port = envs.PORT || 3000;
  await app
    .listen(port)
    .then(app.getUrl)
    .then((appUrl) => {
      logger.log(`🚀 API running on ${appUrl}/api`);
      logger.log(`📘 Admin Docs → ${appUrl}/docs/admin`);
      logger.log(`📗 Consumer Docs → ${appUrl}/docs/consumer`);
    });

  if (isOnVercel === false && envs.NGROK_AUTH_TOKEN !== `NGROK_AUTH_TOKEN` && envs.NGROK_DOMAIN !== `NGROK_DOMAIN`) {
    const ngrokService = app.get(NgrokIngressService);

    await ngrokService.startIfEnabled({
      port,
      authtoken: envs.NGROK_AUTH_TOKEN,
      domain: envs.NGROK_DOMAIN,
    });
  }

  return app;
}

void bootstrap()
  .then(killAppWithGrace)
  .catch((e) => logger.error(`Bootstrap error: ${e instanceof Error ? e.message : String(e)}`));

function killAppWithGrace(app: INestApplication) {
  async function exitHandler(options: { cleanup?: boolean; exit?: boolean }, exitCode?: number) {
    await app.close();

    if (options.cleanup) logger.log(`App stopped: clean`);
    if (exitCode || exitCode === 0) logger.log(`App stopped: exit code: ${exitCode}`);
    setTimeout(() => process.exit(1), 5000);
    process.exit(0);
  }

  process.stdin.resume();
  process.on(`unhandledRejection`, (error: unknown) => {
    const err = error as { code?: string };
    if (err?.code == `ERR_HTTP_HEADERS_SENT`) {
      logger.log(`ERR_HTTP_HEADERS_SENT with error code: ${err.code}`);
      return;
    }
    logger.error({ error, caller: bootstrap.name, message: `Unhandled rejection` });
    process.exit(1);
  });
  process.on(`exit`, exitHandler.bind(null, { cleanup: true }));
  process.on(`SIGINT`, exitHandler.bind(null, { exit: true }));
  process.on(`SIGUSR1`, exitHandler.bind(null, { exit: true }));
  process.on(`SIGUSR2`, exitHandler.bind(null, { exit: true }));
  process.on(`uncaughtException`, exitHandler.bind(null, { exit: true }));
}
