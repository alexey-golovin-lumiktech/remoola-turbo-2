import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { $Enums, type PrismaClient } from '@remoola/database-2';

import { AppModule } from '../app.module';
import { envs } from '../envs';
import { syncBootstrapAdminSeedAccounts } from './admin-bootstrap-rbac';
import { PrismaService } from '../shared/prisma.service';

const logger = new Logger(`BootstrapSeed`);

export async function seedBootstrapData(prisma: PrismaClient, seedLogger: Logger = logger): Promise<void> {
  const admins = [
    {
      type: $Enums.AdminType.ADMIN,
      email: envs.DEFAULT_ADMIN_EMAIL,
      password: envs.DEFAULT_ADMIN_PASSWORD,
    },
    {
      type: $Enums.AdminType.SUPER,
      email: envs.SUPER_ADMIN_EMAIL,
      password: envs.SUPER_ADMIN_PASSWORD,
    },
  ];

  await syncBootstrapAdminSeedAccounts({
    prisma,
    admins,
    logger: seedLogger,
  });

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

  const existingExchangeRates = await prisma.exchangeRateModel.count();
  if (existingExchangeRates === 0) {
    await prisma.exchangeRateModel.createMany({
      data: lookup,
      skipDuplicates: true,
    });
  }
}

async function runBootstrapSeed(): Promise<void> {
  if (envs.isProductionLike && !envs.ALLOW_PRODUCTION_BOOTSTRAP_SEED) {
    const optInMessage = `Set ALLOW_PRODUCTION_BOOTSTRAP_SEED=true to opt in.`;
    const message = [`Refusing to run bootstrap seed when NODE_ENV=${envs.NODE_ENV}.`, optInMessage].join(` `);

    throw new Error(message);
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    await seedBootstrapData(app.get(PrismaService));
    logger.log(`Bootstrap seed completed`);
  } finally {
    await app.close();
  }
}

if (require.main === module) {
  void runBootstrapSeed().catch((error: unknown) => {
    logger.error(`Bootstrap seed failed`, error instanceof Error ? error.stack : String(error));
    process.exit(1);
  });
}
