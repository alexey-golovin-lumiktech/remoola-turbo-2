/**
 * ⚠️ WARNING: This file uses $executeRawUnsafe for fixture management.
 *
 * These patterns are acceptable ONLY because:
 * 1. All inputs are controlled by test/fixture code (no user input).
 * 2. Dynamic table names cannot be parameterized in PostgreSQL.
 *
 * DO NOT copy these patterns to production code. See raw-sql-issues.md.
 */
import { type PrismaClient } from '@remoola/database-2';
import { hashPassword, hashTokenToHex } from '@remoola/security-utils';

import {
  CANONICAL_CONSUMER_APP_SCOPE,
  FIXTURE_NAMESPACE,
  getAdminV2ScenarioPack,
  type ScenarioAdminActionAudit,
  type ScenarioConsumerAction,
} from './admin-v2-scenarios';
import { type FixtureOptions } from './options';

const APP_TABLES = [
  `payment_request_attachment`,
  `ledger_entry_dispute`,
  `ledger_entry_outcome`,
  `consumer_flag`,
  `consumer_admin_note`,
  `consumer_action_log`,
  `admin_action_audit_log`,
  `auth_audit_log`,
  `auth_login_lockout`,
  `auth_sessions`,
  `access_refresh_token`,
  `consumer_resource`,
  `resource_tag`,
  `resource`,
  `document_tag`,
  `payment_method`,
  `billing_details`,
  `ledger_entry`,
  `payment_request`,
  `wallet_auto_conversion_rule`,
  `scheduled_fx_conversion`,
  `contact`,
  `address_details`,
  `personal_details`,
  `organization_details`,
  `google_profile_details`,
  `consumer_settings`,
  `reset_password`,
  `admin_settings`,
  `exchange_rate`,
  `oauth_state`,
  `stripe_webhook_event`,
  `admin`,
  `consumer`,
] as const;

type SeedSummary = {
  perTableLimit: number;
  mode: FixtureOptions[`mode`];
  inserted: Record<string, number>;
};

function incrementCounter(inserted: Record<string, number>, key: string, amount = 1): void {
  inserted[key] = (inserted[key] ?? 0) + amount;
}

async function truncateForRefresh(prisma: PrismaClient): Promise<void> {
  const tableList = APP_TABLES.map((name) => `"${name}"`).join(`, `);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE IF EXISTS "payment_request_expectation_date_archive" RESTART IDENTITY`,
  );
}

function resolveConsumerActionResourceId(
  entry: ScenarioConsumerAction,
  ids: {
    paymentRequestByKey: Map<string, string>;
    paymentMethodByKey: Map<string, string>;
    resourceByKey: Map<string, string>;
    consumerByKey: Map<string, string>;
  },
): string | null {
  if (!entry.resource || !entry.resourceId) {
    return entry.resourceId ?? null;
  }

  if (entry.resource === `payment_request`) {
    return ids.paymentRequestByKey.get(entry.resourceId) ?? null;
  }

  if (entry.resource === `payment_method`) {
    return ids.paymentMethodByKey.get(entry.resourceId) ?? null;
  }

  if (entry.resource === `resource`) {
    return ids.resourceByKey.get(entry.resourceId) ?? null;
  }

  if (entry.resource === `consumer`) {
    return ids.consumerByKey.get(entry.resourceId) ?? null;
  }

  return entry.resourceId;
}

function resolveAdminAuditResourceId(
  entry: ScenarioAdminActionAudit,
  ids: {
    consumerByKey: Map<string, string>;
    ledgerEntryByKey: Map<string, string>;
    walletRuleByConsumerKey: Map<string, string>;
  },
): string | null {
  if (!entry.resourceKey) {
    return null;
  }

  if (entry.resource === `consumer`) {
    return ids.consumerByKey.get(entry.resourceKey) ?? entry.resourceKey;
  }

  if (entry.resource === `ledger_entry`) {
    return ids.ledgerEntryByKey.get(entry.resourceKey) ?? entry.resourceKey;
  }

  if (entry.resource === `wallet_auto_conversion_rule`) {
    return ids.walletRuleByConsumerKey.get(entry.resourceKey) ?? entry.resourceKey;
  }

  return entry.resourceKey;
}

export async function cleanupFixtures(prisma: PrismaClient): Promise<void> {
  const fixtureConsumers = await prisma.consumerModel.findMany({
    where: { email: { startsWith: `${FIXTURE_NAMESPACE}+` } },
    select: { id: true },
  });
  const consumerIds = fixtureConsumers.map((item) => item.id);

  const fixtureAdmins = await prisma.adminModel.findMany({
    where: { email: { startsWith: `${FIXTURE_NAMESPACE}.admin.` } },
    select: { id: true },
  });
  const adminIds = fixtureAdmins.map((item) => item.id);

  const fixtureBillingRows = await prisma.billingDetailsModel.findMany({
    where: { email: { startsWith: `${FIXTURE_NAMESPACE}.billing.` } },
    select: { id: true },
  });
  const billingIds = fixtureBillingRows.map((item) => item.id);

  const fixtureResources = await prisma.resourceModel.findMany({
    where: { key: { startsWith: `${FIXTURE_NAMESPACE}/resource/` } },
    select: { id: true },
  });
  const resourceIds = fixtureResources.map((item) => item.id);

  const fixtureTags = await prisma.documentTagModel.findMany({
    where: { name: { startsWith: `${FIXTURE_NAMESPACE}-tag-` } },
    select: { id: true },
  });
  const tagIds = fixtureTags.map((item) => item.id);

  const fixturePaymentRequests = await prisma.paymentRequestModel.findMany({
    where: {
      OR: [
        { description: { startsWith: `Fixture admin-v2` } },
        ...(consumerIds.length > 0
          ? [{ createdBy: { in: consumerIds } }, { requesterId: { in: consumerIds } }, { payerId: { in: consumerIds } }]
          : []),
      ],
    },
    select: { id: true },
  });
  const paymentRequestIds = fixturePaymentRequests.map((item) => item.id);

  if (adminIds.length > 0) {
    await prisma.adminActionAuditLogModel.deleteMany({
      where: { adminId: { in: adminIds } },
    });
    await prisma.adminSettingsModel.deleteMany({
      where: { adminId: { in: adminIds } },
    });
  }

  await prisma.authAuditLogModel.deleteMany({
    where: {
      OR: [
        { email: { startsWith: `${FIXTURE_NAMESPACE}` } },
        ...(consumerIds.length > 0 ? [{ identityId: { in: consumerIds } }] : []),
        ...(adminIds.length > 0 ? [{ identityId: { in: adminIds } }] : []),
      ],
    },
  });

  await prisma.authLoginLockoutModel.deleteMany({
    where: { email: { startsWith: `${FIXTURE_NAMESPACE}` } },
  });

  if (consumerIds.length > 0) {
    await prisma.authSessionModel.deleteMany({
      where: { consumerId: { in: consumerIds } },
    });
    await prisma.consumerActionLogModel.deleteMany({
      where: {
        OR: [{ consumerId: { in: consumerIds } }, { deviceId: { startsWith: `${FIXTURE_NAMESPACE}-device-` } }],
      },
    });
    await prisma.consumerAdminNoteModel.deleteMany({
      where: { consumerId: { in: consumerIds } },
    });
    await prisma.consumerFlagModel.deleteMany({
      where: { consumerId: { in: consumerIds } },
    });
    await prisma.accessRefreshTokenModel.deleteMany({
      where: { identityId: { in: consumerIds } },
    });
  }

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
          { description: { startsWith: `Fixture admin-v2` } },
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
          { stripePaymentMethodId: { startsWith: `${FIXTURE_NAMESPACE}-pm-` } },
          { stripeFingerprint: { startsWith: `${FIXTURE_NAMESPACE}-fp-` } },
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
        { email: { startsWith: `${FIXTURE_NAMESPACE}.contact.` } },
        ...(consumerIds.length > 0 ? [{ consumerId: { in: consumerIds } }] : []),
      ],
    },
  });

  if (consumerIds.length > 0) {
    await prisma.resetPasswordModel.deleteMany({
      where: { consumerId: { in: consumerIds } },
    });
    await prisma.walletAutoConversionRuleModel.deleteMany({
      where: { consumerId: { in: consumerIds } },
    });
    await prisma.scheduledFxConversionModel.deleteMany({
      where: { consumerId: { in: consumerIds } },
    });
    await prisma.consumerSettingsModel.deleteMany({
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
    where: {
      OR: [{ providerRateId: { startsWith: `${FIXTURE_NAMESPACE}-rate-` } }, { provider: FIXTURE_NAMESPACE }],
    },
  });

  await prisma.resourceModel.deleteMany({
    where: { key: { startsWith: `${FIXTURE_NAMESPACE}/resource/` } },
  });

  await prisma.documentTagModel.deleteMany({
    where: { name: { startsWith: `${FIXTURE_NAMESPACE}-tag-` } },
  });

  await prisma.billingDetailsModel.deleteMany({
    where: { email: { startsWith: `${FIXTURE_NAMESPACE}.billing.` } },
  });

  await prisma.adminModel.deleteMany({
    where: { email: { startsWith: `${FIXTURE_NAMESPACE}.admin.` } },
  });

  await prisma.consumerModel.deleteMany({
    where: { email: { startsWith: `${FIXTURE_NAMESPACE}+` } },
  });

  try {
    await prisma.$executeRawUnsafe(`
      DELETE FROM "payment_request_expectation_date_archive"
      WHERE migration_tag = '${FIXTURE_NAMESPACE}'
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
  const pack = getAdminV2ScenarioPack();

  const adminByKey = new Map<string, string>();
  const consumerByKey = new Map<string, string>();
  const paymentRequestByKey = new Map<string, string>();
  const paymentRequestRequesterByKey = new Map<string, string | null>();
  const paymentMethodByKey = new Map<string, string>();
  const resourceByKey = new Map<string, string>();
  const ledgerEntryByKey = new Map<string, string>();
  const walletRuleByConsumerKey = new Map<string, string>();
  const tagByKey = new Map<string, string>();

  for (const admin of pack.admins) {
    const { hash, salt } = await hashPassword(admin.password);
    const created = await prisma.adminModel.create({
      data: {
        email: admin.email,
        password: hash,
        salt,
        type: admin.type,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt ?? admin.createdAt,
      },
      select: { id: true },
    });
    adminByKey.set(admin.key, created.id);
    incrementCounter(inserted, `admin`);
  }

  for (const tag of pack.documentTags) {
    const created = await prisma.documentTagModel.create({
      data: {
        name: tag.name,
      },
      select: { id: true },
    });
    tagByKey.set(tag.key, created.id);
    incrementCounter(inserted, `document_tag`);
  }

  const deferredAttachments: Array<{ paymentRequestKey: string; requesterKey: string; resourceId: string }> = [];

  for (const consumer of pack.consumers) {
    const { hash, salt } = await hashPassword(consumer.password);
    const createdConsumer = await prisma.consumerModel.create({
      data: {
        email: consumer.email,
        accountType: consumer.accountType,
        contractorKind: consumer.contractorKind ?? null,
        password: hash,
        salt,
        verified: consumer.verified,
        legalVerified: consumer.legalVerified,
        verificationStatus: consumer.verificationStatus,
        verificationReason: consumer.verificationReason ?? null,
        verificationUpdatedAt: consumer.verificationUpdatedAt ?? null,
        verificationUpdatedBy: consumer.verificationUpdatedByAdminKey
          ? (adminByKey.get(consumer.verificationUpdatedByAdminKey) ?? null)
          : null,
        howDidHearAboutUs: consumer.howDidHearAboutUs ?? null,
        howDidHearAboutUsOther: consumer.howDidHearAboutUsOther ?? null,
        stripeCustomerId: consumer.stripeCustomerId ?? null,
        stripeIdentityStatus: consumer.stripeIdentityStatus ?? null,
        stripeIdentitySessionId: consumer.stripeIdentitySessionId ?? null,
        stripeIdentityLastErrorCode: consumer.stripeIdentityLastErrorCode ?? null,
        stripeIdentityLastErrorReason: consumer.stripeIdentityLastErrorReason ?? null,
        stripeIdentityStartedAt: consumer.stripeIdentityStartedAt ?? null,
        stripeIdentityUpdatedAt: consumer.stripeIdentityUpdatedAt ?? null,
        stripeIdentityVerifiedAt: consumer.stripeIdentityVerifiedAt ?? null,
        createdAt: consumer.createdAt,
        updatedAt: consumer.updatedAt ?? consumer.createdAt,
      },
      select: { id: true },
    });
    consumerByKey.set(consumer.key, createdConsumer.id);
    incrementCounter(inserted, `consumer`);

    await prisma.addressDetailsModel.create({
      data: {
        consumerId: createdConsumer.id,
        postalCode: consumer.address.postalCode,
        country: consumer.address.country,
        city: consumer.address.city,
        state: consumer.address.state ?? null,
        street: consumer.address.street,
        createdAt: consumer.createdAt,
        updatedAt: consumer.updatedAt ?? consumer.createdAt,
      },
    });
    incrementCounter(inserted, `address_details`);

    await prisma.personalDetailsModel.create({
      data: {
        consumerId: createdConsumer.id,
        citizenOf: consumer.personal.citizenOf,
        dateOfBirth: consumer.personal.dateOfBirth,
        passportOrIdNumber: consumer.personal.passportOrIdNumber,
        countryOfTaxResidence: consumer.personal.countryOfTaxResidence ?? null,
        taxId: consumer.personal.taxId ?? null,
        phoneNumber: consumer.personal.phoneNumber ?? null,
        firstName: consumer.personal.firstName ?? null,
        lastName: consumer.personal.lastName ?? null,
        legalStatus: consumer.personal.legalStatus ?? null,
        createdAt: consumer.createdAt,
        updatedAt: consumer.updatedAt ?? consumer.createdAt,
      },
    });
    incrementCounter(inserted, `personal_details`);

    await prisma.organizationDetailsModel.create({
      data: {
        consumerId: createdConsumer.id,
        name: consumer.organization.name,
        size: consumer.organization.size,
        consumerRole: consumer.organization.consumerRole ?? null,
        consumerRoleOther: consumer.organization.consumerRoleOther ?? null,
        createdAt: consumer.createdAt,
        updatedAt: consumer.updatedAt ?? consumer.createdAt,
      },
    });
    incrementCounter(inserted, `organization_details`);

    await prisma.googleProfileDetailsModel.create({
      data: {
        consumerId: createdConsumer.id,
        email: consumer.googleProfile.email,
        emailVerified: consumer.googleProfile.emailVerified,
        name: consumer.googleProfile.name,
        givenName: consumer.googleProfile.givenName ?? null,
        familyName: consumer.googleProfile.familyName ?? null,
        picture: consumer.googleProfile.picture ?? null,
        organization: consumer.googleProfile.organization ?? null,
        metadata: consumer.googleProfile.metadata ?? null,
        createdAt: consumer.createdAt,
        updatedAt: consumer.updatedAt ?? consumer.createdAt,
      },
    });
    incrementCounter(inserted, `google_profile_details`);

    await prisma.consumerSettingsModel.create({
      data: {
        consumerId: createdConsumer.id,
        theme: consumer.settings.theme,
        preferredCurrency: consumer.settings.preferredCurrency ?? null,
        createdAt: consumer.createdAt,
        updatedAt: consumer.updatedAt ?? consumer.createdAt,
      },
    });
    incrementCounter(inserted, `consumer_settings`);

    for (const contact of consumer.contacts) {
      await prisma.contactModel.create({
        data: {
          consumerId: createdConsumer.id,
          email: contact.email,
          name: contact.name,
          address: contact.address,
          createdAt: contact.createdAt,
          updatedAt: contact.updatedAt ?? contact.createdAt,
        },
      });
      incrementCounter(inserted, `contact`);
    }

    for (const paymentMethod of consumer.paymentMethods) {
      let billingId: string | null = null;
      if (paymentMethod.billingEmail || paymentMethod.billingName || paymentMethod.billingPhone) {
        const billing = await prisma.billingDetailsModel.create({
          data: {
            email: paymentMethod.billingEmail ?? null,
            name: paymentMethod.billingName ?? null,
            phone: paymentMethod.billingPhone ?? null,
            createdAt: paymentMethod.createdAt,
            updatedAt: paymentMethod.updatedAt ?? paymentMethod.createdAt,
          },
          select: { id: true },
        });
        billingId = billing.id;
        incrementCounter(inserted, `billing_details`);
      }

      const createdMethod = await prisma.paymentMethodModel.create({
        data: {
          consumerId: createdConsumer.id,
          billingDetailsId: billingId,
          type: paymentMethod.type,
          stripePaymentMethodId: paymentMethod.stripePaymentMethodId,
          stripeFingerprint: paymentMethod.stripeFingerprint,
          defaultSelected: paymentMethod.defaultSelected,
          brand: paymentMethod.brand ?? null,
          last4: paymentMethod.last4 ?? null,
          expMonth: paymentMethod.expMonth ?? null,
          expYear: paymentMethod.expYear ?? null,
          bankName: paymentMethod.bankName ?? null,
          bankLast4: paymentMethod.bankLast4 ?? null,
          bankCountry: paymentMethod.bankCountry ?? null,
          bankCurrency: paymentMethod.bankCurrency ?? null,
          serviceFee: paymentMethod.serviceFee,
          createdAt: paymentMethod.createdAt,
          updatedAt: paymentMethod.updatedAt ?? paymentMethod.createdAt,
        },
        select: { id: true },
      });
      paymentMethodByKey.set(paymentMethod.key, createdMethod.id);
      incrementCounter(inserted, `payment_method`);
    }

    for (const resource of consumer.resources) {
      const createdResource = await prisma.resourceModel.create({
        data: {
          access: resource.access,
          originalName: resource.originalName,
          mimetype: resource.mimetype,
          size: resource.size,
          bucket: resource.bucket,
          key: resource.storageKey,
          downloadUrl: resource.downloadUrl,
          createdAt: resource.createdAt,
          updatedAt: resource.updatedAt ?? resource.createdAt,
        },
        select: { id: true },
      });
      resourceByKey.set(resource.key, createdResource.id);
      incrementCounter(inserted, `resource`);

      await prisma.consumerResourceModel.create({
        data: {
          consumerId: createdConsumer.id,
          resourceId: createdResource.id,
          createdAt: resource.createdAt,
          updatedAt: resource.updatedAt ?? resource.createdAt,
        },
      });
      incrementCounter(inserted, `consumer_resource`);

      for (const tagKey of resource.tagKeys) {
        const tagId = tagByKey.get(tagKey);
        if (!tagId) continue;
        await prisma.resourceTagModel.create({
          data: {
            resourceId: createdResource.id,
            tagId,
            createdAt: resource.createdAt,
            updatedAt: resource.updatedAt ?? resource.createdAt,
          },
        });
        incrementCounter(inserted, `resource_tag`);
      }

      for (const paymentRequestKey of resource.attachToPaymentRequestKeys) {
        deferredAttachments.push({
          paymentRequestKey,
          requesterKey: consumer.key,
          resourceId: createdResource.id,
        });
      }
    }

    for (const note of consumer.notes) {
      const adminId = adminByKey.get(note.adminKey);
      if (!adminId) continue;
      await prisma.consumerAdminNoteModel.create({
        data: {
          consumerId: createdConsumer.id,
          adminId,
          content: note.content,
          createdAt: note.createdAt,
        },
      });
      incrementCounter(inserted, `consumer_admin_note`);
    }

    for (const flag of consumer.flags) {
      const adminId = adminByKey.get(flag.adminKey);
      if (!adminId) continue;
      await prisma.consumerFlagModel.create({
        data: {
          consumerId: createdConsumer.id,
          adminId,
          flag: flag.flag,
          reason: flag.reason ?? null,
          version: flag.version ?? 1,
          createdAt: flag.createdAt,
          updatedAt: flag.removedAt ?? flag.createdAt,
          removedAt: flag.removedAt ?? null,
          removedBy: flag.removedByAdminKey ? (adminByKey.get(flag.removedByAdminKey) ?? null) : null,
        },
      });
      incrementCounter(inserted, `consumer_flag`);
    }

    for (const session of consumer.authSessions) {
      await prisma.authSessionModel.create({
        data: {
          consumerId: createdConsumer.id,
          appScope: session.appScope,
          sessionFamilyId: session.sessionFamilyId,
          refreshTokenHash: session.refreshTokenHash,
          accessTokenHash: session.accessTokenHash ?? null,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt ?? session.createdAt,
          expiresAt: session.expiresAt,
          lastUsedAt: session.lastUsedAt,
          revokedAt: session.revokedAt ?? null,
          invalidatedReason: session.invalidatedReason ?? null,
        },
      });
      incrementCounter(inserted, `auth_sessions`);
    }

    for (const audit of consumer.authAudits) {
      await prisma.authAuditLogModel.create({
        data: {
          identityType: audit.identityType,
          identityId: createdConsumer.id,
          email: audit.email,
          event: audit.event,
          ipAddress: audit.ipAddress ?? null,
          userAgent: audit.userAgent ?? null,
          createdAt: audit.createdAt,
        },
      });
      incrementCounter(inserted, `auth_audit_log`);
    }
  }

  for (const payment of pack.paymentRequests) {
    const requesterId = payment.requesterKey ? (consumerByKey.get(payment.requesterKey) ?? null) : null;
    const payerId = payment.payerKey ? (consumerByKey.get(payment.payerKey) ?? null) : null;
    const created = await prisma.paymentRequestModel.create({
      data: {
        requesterId,
        requesterEmail: payment.requesterEmail ?? null,
        payerId,
        payerEmail: payment.payerEmail ?? null,
        currencyCode: payment.currencyCode,
        status: payment.status,
        type: payment.type ?? null,
        paymentRail: payment.paymentRail ?? null,
        amount: payment.amount,
        description: payment.description,
        dueDate: payment.dueDate ?? null,
        sentDate: payment.sentDate ?? null,
        createdBy: payment.createdByKey ? (consumerByKey.get(payment.createdByKey) ?? null) : null,
        updatedBy: payment.updatedByKey ? (consumerByKey.get(payment.updatedByKey) ?? null) : null,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt ?? payment.createdAt,
      },
      select: { id: true, requesterId: true },
    });
    paymentRequestByKey.set(payment.key, created.id);
    paymentRequestRequesterByKey.set(payment.key, created.requesterId ?? null);
    incrementCounter(inserted, `payment_request`);
  }

  for (const attachment of deferredAttachments) {
    const paymentRequestId = paymentRequestByKey.get(attachment.paymentRequestKey);
    const requesterId = consumerByKey.get(attachment.requesterKey);
    if (!paymentRequestId || !requesterId) continue;
    await prisma.paymentRequestAttachmentModel.create({
      data: {
        paymentRequestId,
        requesterId,
        resourceId: attachment.resourceId,
      },
    });
    incrementCounter(inserted, `payment_request_attachment`);
  }

  for (const ledgerEntry of pack.ledgerEntries) {
    const consumerId = consumerByKey.get(ledgerEntry.consumerKey);
    if (!consumerId) continue;

    const created = await prisma.ledgerEntryModel.create({
      data: {
        ledgerId: ledgerEntry.ledgerKey,
        consumerId,
        paymentRequestId: ledgerEntry.paymentRequestKey
          ? (paymentRequestByKey.get(ledgerEntry.paymentRequestKey) ?? null)
          : null,
        type: ledgerEntry.type,
        currencyCode: ledgerEntry.currencyCode,
        status: ledgerEntry.status,
        amount: ledgerEntry.amount,
        feesType: ledgerEntry.feesType ?? null,
        feesAmount: ledgerEntry.feesAmount ?? null,
        stripeId: ledgerEntry.stripeId ?? null,
        idempotencyKey: ledgerEntry.idempotencyKey ?? null,
        metadata: ledgerEntry.metadata ?? null,
        createdBy: ledgerEntry.createdByKey ? (consumerByKey.get(ledgerEntry.createdByKey) ?? null) : null,
        updatedBy: ledgerEntry.updatedByKey ? (consumerByKey.get(ledgerEntry.updatedByKey) ?? null) : null,
        createdAt: ledgerEntry.createdAt,
        updatedAt: ledgerEntry.updatedAt ?? ledgerEntry.createdAt,
      },
      select: { id: true },
    });
    ledgerEntryByKey.set(ledgerEntry.key, created.id);
    incrementCounter(inserted, `ledger_entry`);

    for (const outcome of ledgerEntry.outcomes) {
      await prisma.ledgerEntryOutcomeModel.create({
        data: {
          ledgerEntryId: created.id,
          status: outcome.status,
          source: outcome.source ?? null,
          externalId: outcome.externalId ?? null,
          createdAt: outcome.createdAt,
        },
      });
      incrementCounter(inserted, `ledger_entry_outcome`);
    }

    for (const dispute of ledgerEntry.disputes) {
      await prisma.ledgerEntryDisputeModel.create({
        data: {
          ledgerEntryId: created.id,
          stripeDisputeId: dispute.stripeDisputeId,
          metadata: dispute.metadata,
          createdAt: dispute.createdAt,
        },
      });
      incrementCounter(inserted, `ledger_entry_dispute`);
    }
  }

  for (const consumer of pack.consumers) {
    const consumerId = consumerByKey.get(consumer.key);
    if (!consumerId) continue;

    for (const action of consumer.consumerActions) {
      await prisma.consumerActionLogModel.create({
        data: {
          deviceId: action.deviceId,
          consumerId,
          action: action.action,
          resource: action.resource ?? null,
          resourceId: resolveConsumerActionResourceId(action, {
            paymentRequestByKey,
            paymentMethodByKey,
            resourceByKey,
            consumerByKey,
          }),
          metadata: action.metadata ?? null,
          ipAddress: action.ipAddress ?? null,
          userAgent: action.userAgent ?? null,
          correlationId: action.correlationId ?? null,
          createdAt: action.createdAt,
          updatedAt: action.updatedAt ?? action.createdAt,
        },
      });
      incrementCounter(inserted, `consumer_action_log`);
    }
  }

  for (const rate of pack.exchangeRates) {
    await prisma.exchangeRateModel.create({
      data: {
        fromCurrency: rate.fromCurrency,
        toCurrency: rate.toCurrency,
        rate: rate.rate,
        rateBid: rate.rateBid ?? null,
        rateAsk: rate.rateAsk ?? null,
        spreadBps: rate.spreadBps ?? null,
        status: rate.status,
        effectiveAt: rate.effectiveAt,
        expiresAt: rate.expiresAt ?? null,
        fetchedAt: rate.fetchedAt ?? null,
        provider: rate.provider ?? null,
        providerRateId: rate.providerRateId,
        confidence: rate.confidence ?? null,
        approvedBy: rate.approvedByAdminKey ? (adminByKey.get(rate.approvedByAdminKey) ?? null) : null,
        approvedAt: rate.approvedAt ?? null,
        createdAt: rate.createdAt,
        updatedAt: rate.updatedAt ?? rate.createdAt,
      },
    });
    incrementCounter(inserted, `exchange_rate`);
  }

  for (const rule of pack.walletRules) {
    const consumerId = consumerByKey.get(rule.consumerKey);
    if (!consumerId) continue;
    const createdRule = await prisma.walletAutoConversionRuleModel.create({
      data: {
        consumerId,
        fromCurrency: rule.fromCurrency,
        toCurrency: rule.toCurrency,
        targetBalance: rule.targetBalance,
        maxConvertAmount: rule.maxConvertAmount ?? null,
        minIntervalMinutes: rule.minIntervalMinutes,
        nextRunAt: rule.nextRunAt ?? null,
        lastRunAt: rule.lastRunAt ?? null,
        enabled: rule.enabled,
        metadata: rule.metadata ?? null,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt ?? rule.createdAt,
      },
      select: { id: true },
    });
    walletRuleByConsumerKey.set(rule.consumerKey, createdRule.id);
    incrementCounter(inserted, `wallet_auto_conversion_rule`);
  }

  for (const conversion of pack.scheduledConversions) {
    const consumerId = consumerByKey.get(conversion.consumerKey);
    if (!consumerId) continue;
    await prisma.scheduledFxConversionModel.create({
      data: {
        consumerId,
        fromCurrency: conversion.fromCurrency,
        toCurrency: conversion.toCurrency,
        amount: conversion.amount,
        status: conversion.status,
        executeAt: conversion.executeAt,
        processingAt: conversion.processingAt ?? null,
        executedAt: conversion.executedAt ?? null,
        failedAt: conversion.failedAt ?? null,
        attempts: conversion.attempts,
        lastError: conversion.lastError ?? null,
        ledgerId: conversion.ledgerEntryKey ? (ledgerEntryByKey.get(conversion.ledgerEntryKey) ?? null) : null,
        metadata: conversion.metadata ?? null,
        createdAt: conversion.createdAt,
        updatedAt: conversion.updatedAt ?? conversion.createdAt,
      },
    });
    incrementCounter(inserted, `scheduled_fx_conversion`);
  }

  for (const audit of pack.adminActionAudits) {
    const adminId = adminByKey.get(audit.adminKey);
    if (!adminId) continue;
    await prisma.adminActionAuditLogModel.create({
      data: {
        adminId,
        action: audit.action,
        resource: audit.resource,
        resourceId: resolveAdminAuditResourceId(audit, {
          consumerByKey,
          ledgerEntryByKey,
          walletRuleByConsumerKey,
        }),
        metadata: audit.metadata ?? null,
        ipAddress: audit.ipAddress ?? null,
        userAgent: audit.userAgent ?? null,
        createdAt: audit.createdAt,
      },
    });
    incrementCounter(inserted, `admin_action_audit_log`);
  }

  for (const lockout of pack.lockouts) {
    await prisma.authLoginLockoutModel.upsert({
      where: {
        identityType_email: {
          identityType: lockout.identityType,
          email: lockout.email,
        },
      },
      create: {
        identityType: lockout.identityType,
        email: lockout.email,
        attemptCount: lockout.attemptCount,
        firstAttemptAt: lockout.firstAttemptAt ?? null,
        lockedUntil: lockout.lockedUntil ?? null,
        updatedAt: lockout.updatedAt,
      },
      update: {
        attemptCount: lockout.attemptCount,
        firstAttemptAt: lockout.firstAttemptAt ?? null,
        lockedUntil: lockout.lockedUntil ?? null,
        updatedAt: lockout.updatedAt,
      },
    });
    incrementCounter(inserted, `auth_login_lockout`);
  }

  const resetPasswordTargets = [`healthy-approved-consumer`, `document-gap-consumer`, `suspicious-auth-consumer`];
  for (const key of resetPasswordTargets) {
    const consumerId = consumerByKey.get(key);
    if (!consumerId) continue;
    await prisma.resetPasswordModel.create({
      data: {
        consumerId,
        appScope: CANONICAL_CONSUMER_APP_SCOPE,
        tokenHash: hashTokenToHex(`${FIXTURE_NAMESPACE}-reset-${key}`),
        expiredAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      },
    });
    incrementCounter(inserted, `reset_password`);
  }

  return {
    perTableLimit: options.perTable,
    mode: options.mode,
    inserted,
  };
}
