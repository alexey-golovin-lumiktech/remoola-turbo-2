import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import { ADMIN_ACTION_AUDIT_ACTIONS } from '../../shared/admin-action-audit.service';
import { PrismaService } from '../../shared/prisma.service';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const REASON_MAX_LENGTH = 500;

type RequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
  idempotencyKey?: string | null;
};

function normalizePage(value?: number): number {
  return Number.isFinite(value) && value && value > 0 ? Math.floor(value) : DEFAULT_PAGE;
}

function normalizePageSize(value?: number): number {
  if (!Number.isFinite(value) || !value) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(value)));
}

function normalizeEnumValue<T extends string>(value: string | undefined, values: readonly T[]): T | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  return values.includes(value.trim() as T) ? (value.trim() as T) : undefined;
}

function toNullableIso(value: Date | null | undefined) {
  return value?.toISOString() ?? null;
}

function deriveVersion(updatedAt: Date) {
  return updatedAt.getTime();
}

function deriveStatus(paymentMethod: { disabledAt: Date | null }) {
  return paymentMethod.disabledAt ? `DISABLED` : `ACTIVE`;
}

function mapConsumer(consumer: { id: string; email: string | null }) {
  return {
    id: consumer.id,
    email: consumer.email,
  };
}

function buildStaleVersionPayload(currentUpdatedAt: Date) {
  return {
    error: `STALE_VERSION`,
    message: `Payment method has been modified by another operator`,
    currentVersion: deriveVersion(currentUpdatedAt),
    currentUpdatedAt: currentUpdatedAt.toISOString(),
    recommendedAction: `reload`,
  };
}

function mapBillingDetails(
  billingDetails:
    | {
        id: string;
        email: string | null;
        name: string | null;
        phone: string | null;
        deletedAt: Date | null;
      }
    | null
    | undefined,
) {
  if (!billingDetails) {
    return null;
  }

  return {
    id: billingDetails.id,
    email: billingDetails.email,
    name: billingDetails.name,
    phone: billingDetails.phone,
    deletedAt: toNullableIso(billingDetails.deletedAt),
  };
}

type LockedPaymentMethodRow = {
  id: string;
  consumer_id: string;
  stripe_fingerprint: string | null;
  deleted_at: Date | null;
  disabled_at: Date | null;
  updated_at: Date;
};

async function lockPaymentMethodForMutation(
  tx: Pick<Prisma.TransactionClient, `$queryRaw`>,
  id: string,
): Promise<LockedPaymentMethodRow | null> {
  const rows = await tx.$queryRaw<LockedPaymentMethodRow[]>(Prisma.sql`
    SELECT
      "id",
      "consumer_id",
      "stripe_fingerprint",
      "deleted_at",
      "disabled_at",
      "updated_at"
    FROM "payment_method"
    WHERE "id" = ${id}
    FOR UPDATE
  `);
  return rows[0] ?? null;
}

@Injectable()
export class AdminV2PaymentMethodsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotency: AdminV2IdempotencyService,
  ) {}

  async listPaymentMethods(params?: {
    page?: number;
    pageSize?: number;
    consumerId?: string;
    type?: string;
    defaultSelected?: boolean;
    fingerprint?: string;
    includeDeleted?: boolean;
  }) {
    const page = normalizePage(params?.page);
    const pageSize = normalizePageSize(params?.pageSize);
    const type = normalizeEnumValue(
      params?.type,
      Object.values($Enums.PaymentMethodType) as $Enums.PaymentMethodType[],
    );
    const fingerprint = params?.fingerprint?.trim() || undefined;
    const where: Prisma.PaymentMethodModelWhereInput = {
      ...(params?.includeDeleted ? {} : { deletedAt: null }),
      ...(params?.consumerId?.trim() ? { consumerId: params.consumerId.trim() } : {}),
      ...(type ? { type } : {}),
      ...(typeof params?.defaultSelected === `boolean` ? { defaultSelected: params.defaultSelected } : {}),
      ...(fingerprint ? { stripeFingerprint: fingerprint } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.paymentMethodModel.findMany({
        where,
        orderBy: [{ createdAt: `desc` }, { id: `desc` }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          type: true,
          brand: true,
          last4: true,
          bankLast4: true,
          defaultSelected: true,
          stripeFingerprint: true,
          disabledAt: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          consumer: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.paymentMethodModel.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        type: item.type,
        brand: item.brand,
        last4: item.last4,
        bankLast4: item.bankLast4,
        defaultSelected: item.defaultSelected,
        stripeFingerprint: item.stripeFingerprint,
        status: deriveStatus(item),
        disabledAt: toNullableIso(item.disabledAt),
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        deletedAt: toNullableIso(item.deletedAt),
        consumer: mapConsumer(item.consumer),
      })),
      total,
      page,
      pageSize,
    };
  }

  async getPaymentMethodCase(id: string) {
    const paymentMethod = await this.prisma.paymentMethodModel.findFirst({
      where: { id },
      select: {
        id: true,
        type: true,
        stripePaymentMethodId: true,
        stripeFingerprint: true,
        defaultSelected: true,
        disabledBy: true,
        disabledAt: true,
        brand: true,
        last4: true,
        expMonth: true,
        expYear: true,
        bankName: true,
        bankLast4: true,
        bankCountry: true,
        bankCurrency: true,
        serviceFee: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        consumer: {
          select: {
            id: true,
            email: true,
          },
        },
        billingDetails: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            deletedAt: true,
          },
        },
        duplicateEscalations: {
          orderBy: { createdAt: `desc` },
          take: 1,
          select: {
            id: true,
            fingerprint: true,
            duplicateCount: true,
            duplicatePaymentMethodIds: true,
            createdAt: true,
            escalatedByAdmin: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!paymentMethod) {
      throw new NotFoundException(`Payment method not found`);
    }

    const fingerprintDuplicates = paymentMethod.stripeFingerprint
      ? await this.prisma.paymentMethodModel.findMany({
          where: {
            stripeFingerprint: paymentMethod.stripeFingerprint,
            id: { not: paymentMethod.id },
          },
          orderBy: [{ createdAt: `desc` }, { id: `desc` }],
          select: {
            id: true,
            type: true,
            brand: true,
            last4: true,
            bankLast4: true,
            defaultSelected: true,
            createdAt: true,
            deletedAt: true,
            consumer: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        })
      : [];

    return {
      id: paymentMethod.id,
      type: paymentMethod.type,
      status: deriveStatus(paymentMethod),
      stripePaymentMethodId: paymentMethod.stripePaymentMethodId,
      stripeFingerprint: paymentMethod.stripeFingerprint,
      defaultSelected: paymentMethod.defaultSelected,
      version: deriveVersion(paymentMethod.updatedAt),
      brand: paymentMethod.brand,
      last4: paymentMethod.last4,
      expMonth: paymentMethod.expMonth,
      expYear: paymentMethod.expYear,
      bankName: paymentMethod.bankName,
      bankLast4: paymentMethod.bankLast4,
      bankCountry: paymentMethod.bankCountry,
      bankCurrency: paymentMethod.bankCurrency,
      serviceFee: paymentMethod.serviceFee,
      createdAt: paymentMethod.createdAt.toISOString(),
      updatedAt: paymentMethod.updatedAt.toISOString(),
      disabledAt: toNullableIso(paymentMethod.disabledAt),
      disabledBy: paymentMethod.disabledBy,
      deletedAt: toNullableIso(paymentMethod.deletedAt),
      consumer: mapConsumer(paymentMethod.consumer),
      billingDetails: mapBillingDetails(paymentMethod.billingDetails),
      duplicateEscalation: paymentMethod.duplicateEscalations[0]
        ? {
            id: paymentMethod.duplicateEscalations[0].id,
            fingerprint: paymentMethod.duplicateEscalations[0].fingerprint,
            duplicateCount: paymentMethod.duplicateEscalations[0].duplicateCount,
            duplicatePaymentMethodIds: paymentMethod.duplicateEscalations[0].duplicatePaymentMethodIds,
            createdAt: paymentMethod.duplicateEscalations[0].createdAt.toISOString(),
            escalatedBy: {
              id: paymentMethod.duplicateEscalations[0].escalatedByAdmin.id,
              email: paymentMethod.duplicateEscalations[0].escalatedByAdmin.email,
            },
          }
        : null,
      fingerprintDuplicates: fingerprintDuplicates.map((item) => ({
        id: item.id,
        type: item.type,
        brand: item.brand,
        last4: item.last4,
        bankLast4: item.bankLast4,
        defaultSelected: item.defaultSelected,
        createdAt: item.createdAt.toISOString(),
        deletedAt: toNullableIso(item.deletedAt),
        consumer: mapConsumer(item.consumer),
      })),
    };
  }

  async disablePaymentMethod(
    id: string,
    adminId: string,
    body: { version?: number; confirmed?: boolean; reason?: string },
    meta?: RequestMeta,
  ) {
    if (body.confirmed !== true) {
      throw new BadRequestException(`Confirmation is required for payment method disable`);
    }

    const reason = body.reason?.trim();
    if (!reason) {
      throw new BadRequestException(`Disable reason is required`);
    }
    if (reason.length > REASON_MAX_LENGTH) {
      throw new BadRequestException(`Disable reason is too long`);
    }

    const expectedVersion = Number(body.version);
    if (!Number.isFinite(expectedVersion) || expectedVersion < 1) {
      throw new BadRequestException(`Valid version is required`);
    }

    return this.idempotency.execute({
      adminId,
      scope: `payment-method-disable:${id}`,
      key: meta?.idempotencyKey,
      payload: { paymentMethodId: id, version: expectedVersion, confirmed: true, reason },
      execute: async () => {
        const paymentMethod = await this.prisma.paymentMethodModel.findUnique({
          where: { id },
          select: {
            id: true,
            consumerId: true,
            defaultSelected: true,
            disabledAt: true,
            deletedAt: true,
            updatedAt: true,
          },
        });

        if (!paymentMethod) {
          throw new NotFoundException(`Payment method not found`);
        }
        if (deriveVersion(paymentMethod.updatedAt) !== expectedVersion) {
          throw new ConflictException(buildStaleVersionPayload(paymentMethod.updatedAt));
        }
        if (paymentMethod.deletedAt) {
          throw new ConflictException(`Soft-deleted payment method cannot be disabled`);
        }
        if (paymentMethod.disabledAt) {
          return {
            paymentMethodId: paymentMethod.id,
            consumerId: paymentMethod.consumerId,
            status: `DISABLED`,
            defaultSelected: false,
            disabledAt: paymentMethod.disabledAt.toISOString(),
            version: deriveVersion(paymentMethod.updatedAt),
            alreadyDisabled: true,
            defaultCleared: !paymentMethod.defaultSelected,
          };
        }

        const disabledAt = new Date();
        return this.prisma.$transaction(async (tx) => {
          const updated = await tx.paymentMethodModel.updateMany({
            where: {
              id: paymentMethod.id,
              updatedAt: paymentMethod.updatedAt,
              disabledAt: null,
              deletedAt: null,
            },
            data: {
              disabledAt,
              disabledBy: adminId,
              defaultSelected: false,
            },
          });

          if (updated.count === 0) {
            const current = await tx.paymentMethodModel.findUnique({
              where: { id: paymentMethod.id },
              select: { updatedAt: true },
            });
            throw new ConflictException(
              current ? buildStaleVersionPayload(current.updatedAt) : `Payment method has changed`,
            );
          }

          await tx.adminActionAuditLogModel.create({
            data: {
              adminId,
              action: ADMIN_ACTION_AUDIT_ACTIONS.payment_method_disable,
              resource: `payment_method`,
              resourceId: paymentMethod.id,
              metadata: {
                previousStatus: `ACTIVE`,
                nextStatus: `DISABLED`,
                reason,
                confirmed: true,
                previousDefaultSelected: paymentMethod.defaultSelected,
                defaultCleared: paymentMethod.defaultSelected,
              },
              ipAddress: meta?.ipAddress ?? null,
              userAgent: meta?.userAgent ?? null,
            },
          });

          const fresh = await tx.paymentMethodModel.findUniqueOrThrow({
            where: { id: paymentMethod.id },
            select: {
              id: true,
              consumerId: true,
              defaultSelected: true,
              disabledAt: true,
              updatedAt: true,
            },
          });

          return {
            paymentMethodId: fresh.id,
            consumerId: fresh.consumerId,
            status: `DISABLED`,
            defaultSelected: fresh.defaultSelected,
            disabledAt: fresh.disabledAt?.toISOString() ?? disabledAt.toISOString(),
            version: deriveVersion(fresh.updatedAt),
            alreadyDisabled: false,
            defaultCleared: paymentMethod.defaultSelected,
          };
        });
      },
    });
  }

  async removeDefaultPaymentMethod(id: string, adminId: string, body: { version?: number }, meta?: RequestMeta) {
    const expectedVersion = Number(body.version);
    if (!Number.isFinite(expectedVersion) || expectedVersion < 1) {
      throw new BadRequestException(`Valid version is required`);
    }

    return this.idempotency.execute({
      adminId,
      scope: `payment-method-remove-default:${id}`,
      key: meta?.idempotencyKey,
      payload: { paymentMethodId: id, version: expectedVersion },
      execute: async () => {
        const paymentMethod = await this.prisma.paymentMethodModel.findUnique({
          where: { id },
          select: {
            id: true,
            consumerId: true,
            defaultSelected: true,
            disabledAt: true,
            deletedAt: true,
            updatedAt: true,
          },
        });

        if (!paymentMethod) {
          throw new NotFoundException(`Payment method not found`);
        }
        if (deriveVersion(paymentMethod.updatedAt) !== expectedVersion) {
          throw new ConflictException(buildStaleVersionPayload(paymentMethod.updatedAt));
        }
        if (paymentMethod.deletedAt) {
          throw new ConflictException(`Soft-deleted payment method cannot remove default`);
        }
        if (!paymentMethod.defaultSelected) {
          return {
            paymentMethodId: paymentMethod.id,
            consumerId: paymentMethod.consumerId,
            defaultSelected: false,
            status: deriveStatus(paymentMethod),
            version: deriveVersion(paymentMethod.updatedAt),
            alreadyNotDefault: true,
          };
        }

        return this.prisma.$transaction(async (tx) => {
          const updated = await tx.paymentMethodModel.updateMany({
            where: {
              id: paymentMethod.id,
              updatedAt: paymentMethod.updatedAt,
              deletedAt: null,
              defaultSelected: true,
            },
            data: {
              defaultSelected: false,
            },
          });

          if (updated.count === 0) {
            const current = await tx.paymentMethodModel.findUnique({
              where: { id: paymentMethod.id },
              select: { updatedAt: true },
            });
            throw new ConflictException(
              current ? buildStaleVersionPayload(current.updatedAt) : `Payment method has changed`,
            );
          }

          await tx.adminActionAuditLogModel.create({
            data: {
              adminId,
              action: ADMIN_ACTION_AUDIT_ACTIONS.payment_method_remove_default,
              resource: `payment_method`,
              resourceId: paymentMethod.id,
              metadata: {
                previousDefaultSelected: true,
                nextDefaultSelected: false,
                statusAtMutation: deriveStatus(paymentMethod),
              },
              ipAddress: meta?.ipAddress ?? null,
              userAgent: meta?.userAgent ?? null,
            },
          });

          const fresh = await tx.paymentMethodModel.findUniqueOrThrow({
            where: { id: paymentMethod.id },
            select: {
              id: true,
              consumerId: true,
              defaultSelected: true,
              disabledAt: true,
              updatedAt: true,
            },
          });

          return {
            paymentMethodId: fresh.id,
            consumerId: fresh.consumerId,
            defaultSelected: fresh.defaultSelected,
            status: deriveStatus(fresh),
            version: deriveVersion(fresh.updatedAt),
            alreadyNotDefault: false,
          };
        });
      },
    });
  }

  async escalateDuplicatePaymentMethod(id: string, adminId: string, body: { version?: number }, meta?: RequestMeta) {
    const expectedVersion = Number(body.version);
    if (!Number.isFinite(expectedVersion) || expectedVersion < 1) {
      throw new BadRequestException(`Valid version is required`);
    }

    return this.idempotency.execute({
      adminId,
      scope: `payment-method-duplicate-escalate:${id}`,
      key: meta?.idempotencyKey,
      payload: { paymentMethodId: id, version: expectedVersion },
      execute: async () => {
        const paymentMethod = await this.prisma.paymentMethodModel.findUnique({
          where: { id },
          select: {
            id: true,
            consumerId: true,
            stripeFingerprint: true,
            deletedAt: true,
            disabledAt: true,
            updatedAt: true,
          },
        });

        if (!paymentMethod) {
          throw new NotFoundException(`Payment method not found`);
        }
        if (deriveVersion(paymentMethod.updatedAt) !== expectedVersion) {
          throw new ConflictException(buildStaleVersionPayload(paymentMethod.updatedAt));
        }

        const fingerprint = paymentMethod.stripeFingerprint?.trim();
        if (!fingerprint) {
          throw new ConflictException(`Duplicate escalation requires a schema-backed fingerprint`);
        }

        const duplicates = await this.prisma.paymentMethodModel.findMany({
          where: {
            stripeFingerprint: fingerprint,
            id: { not: paymentMethod.id },
          },
          orderBy: [{ createdAt: `desc` }, { id: `desc` }],
          select: {
            id: true,
          },
        });

        if (duplicates.length === 0) {
          throw new ConflictException(`Duplicate escalation requires at least one matching fingerprint duplicate`);
        }

        return this.prisma.$transaction(async (tx) => {
          const lockedPaymentMethod = await lockPaymentMethodForMutation(tx, paymentMethod.id);
          if (!lockedPaymentMethod) {
            throw new NotFoundException(`Payment method not found`);
          }
          if (deriveVersion(lockedPaymentMethod.updated_at) !== expectedVersion) {
            throw new ConflictException(buildStaleVersionPayload(lockedPaymentMethod.updated_at));
          }
          if (lockedPaymentMethod.deleted_at) {
            throw new ConflictException(`Soft-deleted payment method cannot escalate duplicate review`);
          }

          const existing = await tx.paymentMethodDuplicateEscalationModel.findUnique({
            where: {
              paymentMethodId_fingerprint: {
                paymentMethodId: paymentMethod.id,
                fingerprint,
              },
            },
            select: {
              id: true,
              createdAt: true,
              duplicateCount: true,
              duplicatePaymentMethodIds: true,
            },
          });

          if (existing) {
            return {
              paymentMethodId: paymentMethod.id,
              consumerId: paymentMethod.consumerId,
              escalationId: existing.id,
              fingerprint,
              duplicateCount: existing.duplicateCount,
              duplicatePaymentMethodIds: existing.duplicatePaymentMethodIds,
              createdAt: existing.createdAt.toISOString(),
              alreadyEscalated: true,
            };
          }

          const duplicatePaymentMethodIds = duplicates.map((item) => item.id);
          const escalation = await tx.paymentMethodDuplicateEscalationModel.create({
            data: {
              paymentMethodId: paymentMethod.id,
              fingerprint,
              duplicateCount: duplicatePaymentMethodIds.length + 1,
              duplicatePaymentMethodIds,
              escalatedBy: adminId,
            },
            select: {
              id: true,
              createdAt: true,
              duplicateCount: true,
              duplicatePaymentMethodIds: true,
            },
          });

          await tx.adminActionAuditLogModel.create({
            data: {
              adminId,
              action: ADMIN_ACTION_AUDIT_ACTIONS.payment_method_duplicate_escalate,
              resource: `payment_method`,
              resourceId: paymentMethod.id,
              metadata: {
                fingerprint,
                duplicateCount: escalation.duplicateCount,
                duplicatePaymentMethodIds,
                currentStatus: deriveStatus({ disabledAt: lockedPaymentMethod.disabled_at }),
                softDeleted: false,
              },
              ipAddress: meta?.ipAddress ?? null,
              userAgent: meta?.userAgent ?? null,
            },
          });

          return {
            paymentMethodId: paymentMethod.id,
            consumerId: paymentMethod.consumerId,
            escalationId: escalation.id,
            fingerprint,
            duplicateCount: escalation.duplicateCount,
            duplicatePaymentMethodIds: escalation.duplicatePaymentMethodIds,
            createdAt: escalation.createdAt.toISOString(),
            alreadyEscalated: false,
          };
        });
      },
    });
  }
}
