import { type DynamicModule, type INestApplication, type Provider, type Type, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { Test, type TestingModule, type TestingModuleBuilder } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import express from 'express';

import { JwtAuthGuard } from '../../src/auth/jwt.guard';
import { IDENTITY } from '../../src/common';
import { configureApp } from '../../src/configure-app';
import { envs } from '../../src/envs';
import { AuthGuard } from '../../src/guards/auth.guard';
import { OriginResolverService } from '../../src/shared/origin-resolver.service';
import { PrismaService } from '../../src/shared/prisma.service';

type TestModuleImport = DynamicModule | Promise<DynamicModule> | Type<unknown>;

type TestOverride = {
  provide: object | Type<unknown> | string | symbol;
  useValue: unknown;
};

type BootstrapPreset = `minimal` | `configureApp` | `authContract` | `validationOnly` | `webhook`;

type BootstrapApiTestAppOptions = {
  imports?: TestModuleImport[];
  controllers?: Type<unknown>[];
  providers?: Provider[];
  providerOverrides?: TestOverride[];
  guardOverrides?: TestOverride[];
  preset?: BootstrapPreset;
  identity?: unknown;
  cookieSecret?: string;
  jsonLimit?: string;
  rawBodyProperty?: string;
};

type BootstrapApiTestAppResult<TApp extends INestApplication = INestApplication> = {
  app: TApp;
  moduleFixture: TestingModule;
  close: () => Promise<void>;
};

const DEFAULT_JSON_LIMIT = `10mb`;
const DEFAULT_COOKIE_SECRET = envs.SECURE_SESSION_SECRET;

function createStrictValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    stopAtFirstError: true,
    transform: true,
    transformOptions: {
      excludeExtraneousValues: true,
      exposeUnsetFields: false,
      enableImplicitConversion: true,
      exposeDefaultValues: false,
    },
  });
}

function createAuthContractValidationPipe(): ValidationPipe {
  return new ValidationPipe({
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
  });
}

function buildIdentityGuard(identity: unknown) {
  return {
    canActivate: (context: { switchToHttp: () => { getRequest: () => Record<string | symbol, unknown> } }) => {
      const req = context.switchToHttp().getRequest();
      req[IDENTITY] = identity;
      return true;
    },
  };
}

function applyOverrides(
  builder: TestingModuleBuilder,
  overrides: TestOverride[],
  kind: `provider` | `guard`,
): TestingModuleBuilder {
  let nextBuilder = builder;
  for (const override of overrides) {
    nextBuilder =
      kind === `provider`
        ? nextBuilder.overrideProvider(override.provide).useValue(override.useValue)
        : nextBuilder.overrideGuard(override.provide).useValue(override.useValue);
  }
  return nextBuilder;
}

function configureManualAuthContractApp(
  app: NestExpressApplication,
  moduleFixture: TestingModule,
  cookieSecret: string,
  jsonLimit: string,
) {
  app.setGlobalPrefix(`api`);
  app.use(express.json({ limit: jsonLimit }));
  app.use(cookieParser(cookieSecret));
  app.useGlobalPipes(createAuthContractValidationPipe());

  const reflector = moduleFixture.get(Reflector);
  const jwtService = moduleFixture.get(JwtService);
  const prismaService = moduleFixture.get(PrismaService);
  const originResolver = moduleFixture.get(OriginResolverService, { strict: false });
  app.useGlobalGuards(new AuthGuard(reflector, jwtService, prismaService, originResolver));
}

function configureValidationOnlyApp(app: NestExpressApplication, cookieSecret: string, jsonLimit: string) {
  app.setGlobalPrefix(`api`);
  app.use(express.json({ limit: jsonLimit }));
  app.use(cookieParser(cookieSecret));
  app.useGlobalPipes(createStrictValidationPipe());
}

function configureWebhookApp(
  app: NestExpressApplication,
  rawBodyProperty: string,
  cookieSecret: string,
  jsonLimit: string,
) {
  app.setGlobalPrefix(`api`);
  app.use((req: express.Request, _res: express.Response, next: express.NextFunction) => {
    return express.json({
      limit: jsonLimit,
      verify: (_request, _response, buffer) => {
        (req as express.Request & { [key: string]: Buffer })[rawBodyProperty] = Buffer.from(buffer);
      },
    })(req, _res, next);
  });
  app.use(cookieParser(cookieSecret));
  app.useGlobalPipes(createStrictValidationPipe());
}

export async function bootstrapApiTestApp<TApp extends INestApplication = NestExpressApplication>(
  options: BootstrapApiTestAppOptions,
): Promise<BootstrapApiTestAppResult<TApp>> {
  const {
    imports = [],
    controllers = [],
    providers = [],
    providerOverrides = [],
    guardOverrides = [],
    preset = `minimal`,
    identity,
    cookieSecret = DEFAULT_COOKIE_SECRET,
    jsonLimit = DEFAULT_JSON_LIMIT,
    rawBodyProperty = `rawBody`,
  } = options;

  let builder = Test.createTestingModule({
    imports: imports as Array<DynamicModule | Promise<DynamicModule> | Type<unknown>>,
    controllers,
    providers,
  });

  const finalProviderOverrides = [...providerOverrides];
  const finalGuardOverrides = [...guardOverrides];

  if (preset === `authContract`) {
    finalProviderOverrides.unshift({ provide: AuthGuard, useValue: { canActivate: () => true } });
  }

  if (preset === `validationOnly` && identity !== undefined) {
    finalGuardOverrides.unshift({ provide: JwtAuthGuard, useValue: buildIdentityGuard(identity) });
  }

  builder = applyOverrides(builder, finalProviderOverrides, `provider`);
  builder = applyOverrides(builder, finalGuardOverrides, `guard`);

  const moduleFixture = await builder.compile();
  const app = moduleFixture.createNestApplication<NestExpressApplication>() as TApp & NestExpressApplication;

  switch (preset) {
    case `configureApp`:
      configureApp(app);
      break;
    case `authContract`:
      configureManualAuthContractApp(app, moduleFixture, cookieSecret, jsonLimit);
      break;
    case `validationOnly`:
      configureValidationOnlyApp(app, cookieSecret, jsonLimit);
      break;
    case `webhook`:
      configureWebhookApp(app, rawBodyProperty, cookieSecret, jsonLimit);
      break;
    case `minimal`:
    default:
      break;
  }

  await app.init();

  return {
    app: app as TApp,
    moduleFixture,
    close: async () => {
      await app.close();
    },
  };
}
