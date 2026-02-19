import { randomUUID } from 'crypto';

import { $Enums, Prisma, type PrismaClient } from '@remoola/database-2';
import { hashPassword } from '@remoola/security-utils';

import { type FixtureOptions } from './options';

const FIXTURE_PREFIX = `fixture`;
const SEED_RUN_SUFFIX = randomUUID().slice(0, 8);

const APP_TABLES = [
  `access_refresh_token`,
  `address_details`,
  `admin`,
  `billing_details`,
  `consumer`,
  `consumer_resource`,
  `contact`,
  `exchange_rate`,
  `wallet_auto_conversion_rule`,
  `scheduled_fx_conversion`,
  `google_profile_details`,
  `organization_details`,
  `payment_method`,
  `payment_request`,
  `ledger_entry`,
  `payment_request_attachment`,
  `personal_details`,
  `reset_password`,
  `resource`,
  `document_tag`,
  `resource_tag`,
  `user_settings`,
] as const;

type SeedSummary = {
  perTableLimit: number;
  mode: FixtureOptions[`mode`];
  inserted: Record<string, number>;
};

function emailFor(index: number): string {
  return `${FIXTURE_PREFIX}+${index}@remoola.local`;
}

function dateOffsetDays(offset: number): Date {
  const base = new Date(`2026-01-01T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + offset);
  return base;
}

function pickCurrency(index: number): $Enums.CurrencyCode {
  const currencies: $Enums.CurrencyCode[] = [
    $Enums.CurrencyCode.USD,
    $Enums.CurrencyCode.EUR,
    $Enums.CurrencyCode.GBP,
    $Enums.CurrencyCode.JPY,
    $Enums.CurrencyCode.AUD,
  ];
  return currencies[index % currencies.length] ?? $Enums.CurrencyCode.USD;
}

async function truncateForRefresh(prisma: PrismaClient): Promise<void> {
  const tableList = APP_TABLES.map((name) => `"${name}"`).join(`, `);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE IF EXISTS "payment_request_expectation_date_archive" RESTART IDENTITY`,
  );
}

export async function cleanupFixtures(prisma: PrismaClient): Promise<void> {
  const fixtureConsumers = await prisma.consumerModel.findMany({
    where: { email: { startsWith: `${FIXTURE_PREFIX}+` } },
    select: { id: true },
  });
  const consumerIds = fixtureConsumers.map((item) => item.id);

  const fixtureBillingRows = await prisma.billingDetailsModel.findMany({
    where: { email: { startsWith: `${FIXTURE_PREFIX}.billing.` } },
    select: { id: true },
  });
  const billingIds = fixtureBillingRows.map((item) => item.id);

  const fixtureResources = await prisma.resourceModel.findMany({
    where: { key: { startsWith: `${FIXTURE_PREFIX}/resource/` } },
    select: { id: true },
  });
  const resourceIds = fixtureResources.map((item) => item.id);

  const fixtureTags = await prisma.documentTagModel.findMany({
    where: { name: { startsWith: `${FIXTURE_PREFIX}-tag-` } },
    select: { id: true },
  });
  const tagIds = fixtureTags.map((item) => item.id);

  const fixturePaymentRequests = await prisma.paymentRequestModel.findMany({
    where: {
      OR: [
        { description: { startsWith: `Fixture payment request` } },
        ...(consumerIds.length > 0 ? [{ createdBy: { in: consumerIds } }] : []),
      ],
    },
    select: { id: true },
  });
  const paymentRequestIds = fixturePaymentRequests.map((item) => item.id);

  await prisma.accessRefreshTokenModel.deleteMany({
    where: {
      OR: [
        { accessToken: { startsWith: `access-${FIXTURE_PREFIX}-` } },
        { refreshToken: { startsWith: `refresh-${FIXTURE_PREFIX}-` } },
        ...(consumerIds.length > 0 ? [{ identityId: { in: consumerIds } }] : []),
      ],
    },
  });

  if (paymentRequestIds.length > 0 || consumerIds.length > 0) {
    await prisma.ledgerEntryModel.deleteMany({
      where: {
        OR: [
          ...(paymentRequestIds.length > 0 ? [{ paymentRequestId: { in: paymentRequestIds } }] : []),
          ...(consumerIds.length > 0 ? [{ consumerId: { in: consumerIds } }] : []),
        ],
      },
    });
  }

  if (paymentRequestIds.length > 0 || resourceIds.length > 0 || consumerIds.length > 0) {
    await prisma.paymentRequestAttachmentModel.deleteMany({
      where: {
        OR: [
          ...(paymentRequestIds.length > 0 ? [{ paymentRequestId: { in: paymentRequestIds } }] : []),
          ...(resourceIds.length > 0 ? [{ resourceId: { in: resourceIds } }] : []),
          ...(consumerIds.length > 0 ? [{ requesterId: { in: consumerIds } }] : []),
        ],
      },
    });
  }

  if (paymentRequestIds.length > 0 || consumerIds.length > 0) {
    await prisma.paymentRequestModel.deleteMany({
      where: {
        OR: [
          { description: { startsWith: `Fixture payment request` } },
          ...(paymentRequestIds.length > 0 ? [{ id: { in: paymentRequestIds } }] : []),
          ...(consumerIds.length > 0
            ? [
                { createdBy: { in: consumerIds } },
                { requesterId: { in: consumerIds } },
                { payerId: { in: consumerIds } },
              ]
            : []),
        ],
      },
    });
  }

  if (consumerIds.length > 0 || billingIds.length > 0) {
    await prisma.paymentMethodModel.deleteMany({
      where: {
        OR: [
          { stripePaymentMethodId: { startsWith: `${FIXTURE_PREFIX}-pm-` } },
          { stripeFingerprint: { startsWith: `${FIXTURE_PREFIX}-fp-` } },
          ...(consumerIds.length > 0 ? [{ consumerId: { in: consumerIds } }] : []),
          ...(billingIds.length > 0 ? [{ billingDetailsId: { in: billingIds } }] : []),
        ],
      },
    });
  }

  if (resourceIds.length > 0 || tagIds.length > 0) {
    await prisma.resourceTagModel.deleteMany({
      where: {
        OR: [
          ...(resourceIds.length > 0 ? [{ resourceId: { in: resourceIds } }] : []),
          ...(tagIds.length > 0 ? [{ tagId: { in: tagIds } }] : []),
        ],
      },
    });
  }

  if (consumerIds.length > 0 || resourceIds.length > 0) {
    await prisma.consumerResourceModel.deleteMany({
      where: {
        OR: [
          ...(consumerIds.length > 0 ? [{ consumerId: { in: consumerIds } }] : []),
          ...(resourceIds.length > 0 ? [{ resourceId: { in: resourceIds } }] : []),
        ],
      },
    });
  }

  await prisma.contactModel.deleteMany({
    where: {
      OR: [
        { email: { startsWith: `${FIXTURE_PREFIX}.contact.` } },
        ...(consumerIds.length > 0 ? [{ consumerId: { in: consumerIds } }] : []),
      ],
    },
  });

  await prisma.resetPasswordModel.deleteMany({
    where: {
      OR: [
        { token: { startsWith: `${FIXTURE_PREFIX}-reset-token-` } },
        ...(consumerIds.length > 0 ? [{ consumerId: { in: consumerIds } }] : []),
      ],
    },
  });

  if (consumerIds.length > 0) {
    await prisma.walletAutoConversionRuleModel.deleteMany({
      where: { consumerId: { in: consumerIds } },
    });
    await prisma.scheduledFxConversionModel.deleteMany({
      where: { consumerId: { in: consumerIds } },
    });
    await prisma.userSettingsModel.deleteMany({
      where: { consumerId: { in: consumerIds } },
    });
    await prisma.addressDetailsModel.deleteMany({
      where: { consumerId: { in: consumerIds } },
    });
    await prisma.personalDetailsModel.deleteMany({
      where: { consumerId: { in: consumerIds } },
    });
    await prisma.organizationDetailsModel.deleteMany({
      where: { consumerId: { in: consumerIds } },
    });
    await prisma.googleProfileDetailsModel.deleteMany({
      where: { consumerId: { in: consumerIds } },
    });
  }

  await prisma.exchangeRateModel.deleteMany({
    where: { providerRateId: { startsWith: `${FIXTURE_PREFIX}-rate-` } },
  });

  await prisma.resourceModel.deleteMany({
    where: { key: { startsWith: `${FIXTURE_PREFIX}/resource/` } },
  });

  await prisma.documentTagModel.deleteMany({
    where: { name: { startsWith: `${FIXTURE_PREFIX}-tag-` } },
  });

  await prisma.billingDetailsModel.deleteMany({
    where: { email: { startsWith: `${FIXTURE_PREFIX}.billing.` } },
  });

  await prisma.adminModel.deleteMany({
    where: { email: { startsWith: `${FIXTURE_PREFIX}.admin.` } },
  });

  await prisma.consumerModel.deleteMany({
    where: { email: { startsWith: `${FIXTURE_PREFIX}+` } },
  });

  try {
    await prisma.$executeRawUnsafe(`
      DELETE FROM "payment_request_expectation_date_archive"
      WHERE migration_tag = 'fixture-seed'
    `);
  } catch {
    // Archive table may not exist in DBs where migration is not applied yet.
  }
}

export async function seedAllTables(prisma: PrismaClient, options: FixtureOptions): Promise<SeedSummary> {
  if (options.mode === `refresh`) {
    await truncateForRefresh(prisma);
  } else {
    await cleanupFixtures(prisma);
  }

  if (options.mode === `cleanup`) {
    return {
      perTableLimit: options.perTable,
      mode: options.mode,
      inserted: {},
    };
  }

  const inserted: Record<string, number> = {};

  const adminTarget = Math.min(options.perTable, 2);
  for (let i = 0; i < adminTarget; i += 1) {
    const { hash, salt } = await hashPassword(`${FIXTURE_PREFIX}-password`);
    await prisma.adminModel.create({
      data: {
        email: `${FIXTURE_PREFIX}.admin.${i}@remoola.local`,
        password: hash,
        salt,
        type: i === 0 ? $Enums.AdminType.SUPER : $Enums.AdminType.ADMIN,
      },
    });
  }
  inserted.admin = adminTarget;

  const consumers: Array<{ id: string }> = [];
  for (let i = 0; i < options.perTable; i += 1) {
    const { hash, salt } = await hashPassword(`${FIXTURE_PREFIX}-consumer-password-${i}`);
    const created = await prisma.consumerModel.create({
      data: {
        email: emailFor(i),
        accountType: i % 2 === 0 ? $Enums.AccountType.BUSINESS : $Enums.AccountType.CONTRACTOR,
        contractorKind: i % 2 === 0 ? $Enums.ContractorKind.ENTITY : $Enums.ContractorKind.INDIVIDUAL,
        verified: true,
        legalVerified: true,
        verificationStatus: $Enums.VerificationStatus.APPROVED,
        password: hash,
        salt,
      },
      select: { id: true },
    });
    consumers.push(created);
  }
  inserted.consumer = consumers.length;

  for (let i = 0; i < consumers.length; i += 1) {
    const consumerId = consumers[i]?.id;
    if (!consumerId) continue;
    await prisma.addressDetailsModel.create({
      data: {
        consumerId,
        postalCode: `ZIP${10000 + i}`,
        country: `CA`,
        city: `Toronto`,
        state: `ON`,
        street: `${i + 1} King St W`,
      },
    });
    await prisma.personalDetailsModel.create({
      data: {
        consumerId,
        citizenOf: `CA`,
        dateOfBirth: dateOffsetDays(-(10_000 + i)),
        passportOrIdNumber: `ID-${FIXTURE_PREFIX}-${i}`,
        countryOfTaxResidence: `CA`,
        taxId: `TAX-${100000 + i}`,
        phoneNumber: `+1416555${String(1000 + i).slice(-4)}`,
        firstName: `Fixture${i}`,
        lastName: `User${i}`,
      },
    });
    await prisma.organizationDetailsModel.create({
      data: {
        consumerId,
        name: `Fixture Org ${i}`,
        consumerRole: $Enums.ConsumerRole.ENGINEERING,
        size: $Enums.OrganizationSize.SMALL,
      },
    });
    await prisma.googleProfileDetailsModel.create({
      data: {
        consumerId,
        email: emailFor(i),
        emailVerified: true,
        name: `Fixture User ${i}`,
        givenName: `Fixture${i}`,
        familyName: `User${i}`,
        picture: `https://example.com/avatar/${i}.png`,
        organization: `Remoola Fixtures`,
        metadata: { source: FIXTURE_PREFIX, index: i },
      },
    });
    await prisma.userSettingsModel.create({
      data: {
        consumerId,
        theme: i % 2 === 0 ? $Enums.Theme.LIGHT : $Enums.Theme.DARK,
      },
    });
    await prisma.contactModel.create({
      data: {
        consumerId,
        email: `${FIXTURE_PREFIX}.contact.${i}@remoola.local`,
        name: `Contact ${i}`,
        address: { country: `CA`, city: `Toronto`, street: `${i + 10} Bay St` },
      },
    });
    await prisma.accessRefreshTokenModel.create({
      data: {
        identityId: consumerId,
        accessToken: `access-${FIXTURE_PREFIX}-${i}`,
        refreshToken: `refresh-${FIXTURE_PREFIX}-${i}`,
      },
    });
  }
  inserted.address_details = consumers.length;
  inserted.personal_details = consumers.length;
  inserted.organization_details = consumers.length;
  inserted.google_profile_details = consumers.length;
  inserted.user_settings = consumers.length;
  inserted.contact = consumers.length;
  inserted.access_refresh_token = consumers.length;

  const billingDetails: Array<{ id: string }> = [];
  for (let i = 0; i < options.perTable; i += 1) {
    const row = await prisma.billingDetailsModel.create({
      data: {
        email: `${FIXTURE_PREFIX}.billing.${i}@remoola.local`,
        name: `Billing ${i}`,
        phone: `+1416777${String(1000 + i).slice(-4)}`,
      },
      select: { id: true },
    });
    billingDetails.push(row);
  }
  inserted.billing_details = billingDetails.length;

  for (let i = 0; i < options.perTable; i += 1) {
    const consumerId = consumers[i]?.id;
    const billingId = billingDetails[i]?.id;
    if (!consumerId || !billingId) continue;
    await prisma.paymentMethodModel.create({
      data: {
        consumerId,
        billingDetailsId: billingId,
        type: i % 2 === 0 ? $Enums.PaymentMethodType.CREDIT_CARD : $Enums.PaymentMethodType.BANK_ACCOUNT,
        stripePaymentMethodId: `${FIXTURE_PREFIX}-pm-${i}`,
        stripeFingerprint: `${FIXTURE_PREFIX}-fp-${i}`,
        defaultSelected: i === 0,
        brand: `visa`,
        last4: String(1000 + i).slice(-4),
        expMonth: `12`,
        expYear: `2030`,
        bankName: `Fixture Bank`,
        bankLast4: String(2000 + i).slice(-4),
        bankCountry: `CA`,
        bankCurrency: pickCurrency(i),
        serviceFee: 1,
      },
    });
  }
  inserted.payment_method = options.perTable;

  const resources: Array<{ id: string }> = [];
  for (let i = 0; i < options.perTable; i += 1) {
    const row = await prisma.resourceModel.create({
      data: {
        access: i % 2 === 0 ? $Enums.ResourceAccess.PUBLIC : $Enums.ResourceAccess.PRIVATE,
        originalName: `${FIXTURE_PREFIX}-document-${i}.pdf`,
        mimetype: `application/pdf`,
        size: 1024 + i,
        bucket: `fixtures`,
        key: `${FIXTURE_PREFIX}/resource/${i}`,
        downloadUrl: `https://example.com/${FIXTURE_PREFIX}/resource/${i}`,
      },
      select: { id: true },
    });
    resources.push(row);
  }
  inserted.resource = resources.length;

  for (let i = 0; i < options.perTable; i += 1) {
    const consumerId = consumers[i]?.id;
    const resourceId = resources[i]?.id;
    if (!consumerId || !resourceId) continue;
    await prisma.consumerResourceModel.create({
      data: {
        consumerId,
        resourceId,
      },
    });
  }
  inserted.consumer_resource = options.perTable;

  const tagTarget = Math.min(options.perTable, 10);
  const tags: Array<{ id: string }> = [];
  for (let i = 0; i < tagTarget; i += 1) {
    const tag = await prisma.documentTagModel.create({
      data: {
        name: `${FIXTURE_PREFIX}-tag-${SEED_RUN_SUFFIX}-${i}`,
      },
      select: { id: true },
    });
    tags.push(tag);
  }
  inserted.document_tag = tags.length;

  for (let i = 0; i < options.perTable; i += 1) {
    const resourceId = resources[i]?.id;
    const tagId = tags[i % tags.length]?.id;
    if (!resourceId || !tagId) continue;
    await prisma.resourceTagModel.create({
      data: {
        resourceId,
        tagId,
      },
    });
  }
  inserted.resource_tag = options.perTable;

  const paymentRequestTarget = Math.max(1, Math.floor(options.perTable / 2));
  const paymentRequests: Array<{ id: string; payerId: string; requesterId: string }> = [];
  for (let i = 0; i < paymentRequestTarget; i += 1) {
    const payer = consumers[(i + 1) % consumers.length];
    const requester = consumers[i % consumers.length];
    if (!payer?.id || !requester?.id) continue;
    const row = await prisma.paymentRequestModel.create({
      data: {
        payerId: payer.id,
        requesterId: requester.id,
        currencyCode: pickCurrency(i),
        status: $Enums.TransactionStatus.COMPLETED,
        amount: 100 + i,
        description: `Fixture payment request ${i}`,
        dueDate: dateOffsetDays(20 + i),
        sentDate: dateOffsetDays(i),
        createdBy: requester.id,
        updatedBy: requester.id,
      },
      select: { id: true, payerId: true, requesterId: true },
    });
    paymentRequests.push(row);
  }
  inserted.payment_request = paymentRequests.length;

  try {
    const expectationValues = paymentRequests.map(
      (payment, index) => Prisma.sql`(${payment.id}::uuid, ${dateOffsetDays(10 + index)}::timestamptz)`,
    );
    if (expectationValues.length > 0) {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE payment_request AS pr
        SET expectation_date = fixture_values.expectation_date
        FROM (
          VALUES ${Prisma.join(expectationValues)}
        ) AS fixture_values(id, expectation_date)
        WHERE pr.id = fixture_values.id
      `);
    }
  } catch {
    // Column may not exist after expectation_date removal migration.
  }

  let ledgerEntryCount = 0;
  for (let i = 0; i < paymentRequests.length; i += 1) {
    const payment = paymentRequests[i];
    if (!payment) continue;
    const ledgerId = randomUUID();
    const amount = 100 + i;
    await prisma.ledgerEntryModel.create({
      data: {
        ledgerId,
        consumerId: payment.payerId,
        paymentRequestId: payment.id,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
        currencyCode: pickCurrency(i),
        status: $Enums.TransactionStatus.COMPLETED,
        amount: -amount,
        metadata: {
          rail: $Enums.PaymentRail.CARD,
          source: FIXTURE_PREFIX,
          counterpartyId: payment.requesterId,
        },
        createdBy: payment.requesterId,
        updatedBy: payment.requesterId,
      },
    });
    await prisma.ledgerEntryModel.create({
      data: {
        ledgerId,
        consumerId: payment.requesterId,
        paymentRequestId: payment.id,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
        currencyCode: pickCurrency(i),
        status: $Enums.TransactionStatus.COMPLETED,
        amount: amount,
        metadata: {
          rail: $Enums.PaymentRail.CARD,
          source: FIXTURE_PREFIX,
          counterpartyId: payment.payerId,
        },
        createdBy: payment.requesterId,
        updatedBy: payment.requesterId,
      },
    });
    ledgerEntryCount += 2;
  }
  inserted.ledger_entry = ledgerEntryCount;

  const attachmentCount = Math.min(paymentRequests.length, resources.length);
  for (let i = 0; i < attachmentCount; i += 1) {
    const payment = paymentRequests[i];
    const resource = resources[i];
    if (!payment?.id || !resource?.id) continue;
    await prisma.paymentRequestAttachmentModel.create({
      data: {
        paymentRequestId: payment.id,
        requesterId: payment.requesterId,
        resourceId: resource.id,
      },
    });
  }
  inserted.payment_request_attachment = attachmentCount;

  for (let i = 0; i < options.perTable; i += 1) {
    const consumerId = consumers[i]?.id;
    if (!consumerId) continue;
    await prisma.resetPasswordModel.create({
      data: {
        consumerId,
        token: `${FIXTURE_PREFIX}-reset-token-${i}`,
        expiredAt: dateOffsetDays(5 + i),
      },
    });
  }
  inserted.reset_password = options.perTable;

  for (let i = 0; i < options.perTable; i += 1) {
    await prisma.exchangeRateModel.create({
      data: {
        fromCurrency: pickCurrency(i),
        toCurrency: pickCurrency(i + 1),
        rate: 1.1 + i * 0.001,
        rateBid: 1.09 + i * 0.001,
        rateAsk: 1.11 + i * 0.001,
        spreadBps: 10 + i,
        status: $Enums.ExchangeRateStatus.APPROVED,
        effectiveAt: dateOffsetDays(i),
        expiresAt: dateOffsetDays(i + 30),
        fetchedAt: dateOffsetDays(i),
        provider: `fixture-provider`,
        providerRateId: `${FIXTURE_PREFIX}-rate-${i}`,
        confidence: 90,
      },
    });
  }
  inserted.exchange_rate = options.perTable;

  for (let i = 0; i < options.perTable; i += 1) {
    const consumerId = consumers[i]?.id;
    if (!consumerId) continue;
    await prisma.walletAutoConversionRuleModel.create({
      data: {
        consumerId,
        fromCurrency: pickCurrency(i),
        toCurrency: pickCurrency(i + 1),
        targetBalance: 1000 + i,
        maxConvertAmount: 250 + i,
        minIntervalMinutes: 60,
        nextRunAt: dateOffsetDays(i + 1),
        lastRunAt: dateOffsetDays(i),
        enabled: true,
        metadata: {
          source: FIXTURE_PREFIX,
          index: i,
        },
      },
    });
  }
  inserted.wallet_auto_conversion_rule = options.perTable;

  for (let i = 0; i < options.perTable; i += 1) {
    const consumerId = consumers[i]?.id;
    if (!consumerId) continue;
    await prisma.scheduledFxConversionModel.create({
      data: {
        consumerId,
        fromCurrency: pickCurrency(i),
        toCurrency: pickCurrency(i + 1),
        amount: 50 + i,
        status: $Enums.ScheduledFxConversionStatus.PENDING,
        executeAt: dateOffsetDays(i + 2),
        attempts: i % 3,
        lastError: null,
        metadata: {
          source: FIXTURE_PREFIX,
          index: i,
        },
      },
    });
  }
  inserted.scheduled_fx_conversion = options.perTable;

  try {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "payment_request_expectation_date_archive" (
        "payment_request_id",
        "expectation_date",
        "migration_tag"
      )
      SELECT
        pr.id,
        NOW() - (ROW_NUMBER() OVER (ORDER BY pr.created_at)) * INTERVAL '1 day',
        'fixture-seed'
      FROM "payment_request" pr
      ORDER BY pr.created_at
      LIMIT ${paymentRequestTarget}
      ON CONFLICT DO NOTHING
    `);
  } catch {
    // Archive table may not exist in DBs where migration is not applied yet.
  }

  inserted.payment_request_expectation_date_archive = paymentRequestTarget;

  return {
    perTableLimit: options.perTable,
    mode: options.mode,
    inserted,
  };
}
