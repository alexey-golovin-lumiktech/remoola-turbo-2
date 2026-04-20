import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import type { ConsumerAppScope } from '@remoola/api-types';
import { $Enums, Prisma } from '@remoola/database-2';

import { ConsumerAuthService } from '../../consumer/auth/auth.service';
import { normalizeConsumerFacingTransactionStatus } from '../../consumer/consumer-status-compat';
import { ConsumerContractsService } from '../../consumer/modules/contracts/consumer-contracts.service';
import { AdminActionAuditService, ADMIN_ACTION_AUDIT_ACTIONS } from '../../shared/admin-action-audit.service';
import { AUTH_IDENTITY_TYPES } from '../../shared/auth-audit.service';
import { PrismaService } from '../../shared/prisma.service';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';

const SEARCH_MAX_LEN = 200;
const NOTE_MAX_LEN = 4000;
const FLAG_MAX_LEN = 64;
const REASON_MAX_LEN = 500;
const MAX_PAGE_SIZE = 100;
const DEFAULT_HISTORY_PAGE_SIZE = 10;
const DEFAULT_CONSUMER_ACTION_RANGE_DAYS = 7;
const ACCOUNT_TYPES = Object.values($Enums.AccountType) as string[];
const VERIFICATION_STATUSES = Object.values($Enums.VerificationStatus) as string[];
const CONTRACTOR_KINDS = Object.values($Enums.ContractorKind) as string[];

type RequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
  idempotencyKey?: string | null;
};

type SuspendConsumerBody = {
  confirmed?: boolean;
  reason?: string;
};

type ResendConsumerEmailBody = {
  emailKind: `signup_verification` | `password_recovery`;
  appScope: ConsumerAppScope;
};

function normalizeFlag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, `_`)
    .replace(/^_+|_+$/g, ``)
    .slice(0, FLAG_MAX_LEN);
}

function normalizePagination(page?: number, pageSize?: number) {
  const safePage = Math.max(1, page ?? 1);
  const safePageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize ?? DEFAULT_HISTORY_PAGE_SIZE));
  return {
    page: safePage,
    pageSize: safePageSize,
    skip: (safePage - 1) * safePageSize,
  };
}

function buildCreatedAtFilter(dateFrom?: Date, dateTo?: Date) {
  if (dateFrom && dateTo) {
    return { gte: dateFrom, lte: dateTo };
  }
  if (dateFrom) {
    return { gte: dateFrom };
  }
  if (dateTo) {
    return { lte: dateTo };
  }
  return undefined;
}

@Injectable()
export class AdminV2ConsumersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly consumerContractsService: ConsumerContractsService,
    private readonly adminActionAudit: AdminActionAuditService,
    private readonly consumerAuthService: ConsumerAuthService,
    private readonly idempotency: AdminV2IdempotencyService,
  ) {}

  private async requireConsumer(consumerId: string) {
    const consumer = await this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      select: {
        id: true,
        email: true,
        suspendedAt: true,
        suspendedBy: true,
        suspensionReason: true,
      },
    });
    if (!consumer) {
      throw new NotFoundException(`Consumer not found`);
    }
    return consumer;
  }

  async listConsumers(params?: {
    page?: number;
    pageSize?: number;
    q?: string;
    accountType?: string;
    contractorKind?: string;
    verificationStatus?: string;
    includeDeleted?: boolean;
  }) {
    const pageSize = Math.min(Math.max(params?.pageSize ?? 20, 1), 100);
    const page = Math.max(params?.page ?? 1, 1);
    const skip = (page - 1) * pageSize;
    const search =
      typeof params?.q === `string` && params.q.trim().length > 0
        ? params.q.trim().slice(0, SEARCH_MAX_LEN)
        : undefined;
    const accountType =
      params?.accountType && ACCOUNT_TYPES.includes(params.accountType)
        ? (params.accountType as $Enums.AccountType)
        : undefined;
    const contractorKind =
      params?.contractorKind && CONTRACTOR_KINDS.includes(params.contractorKind)
        ? (params.contractorKind as $Enums.ContractorKind)
        : undefined;
    const verificationStatus =
      params?.verificationStatus && VERIFICATION_STATUSES.includes(params.verificationStatus)
        ? (params.verificationStatus as $Enums.VerificationStatus)
        : undefined;

    const where: Prisma.ConsumerModelWhereInput = {
      ...(params?.includeDeleted === true ? {} : { deletedAt: null }),
      ...(accountType ? { accountType } : {}),
      ...(contractorKind ? { contractorKind } : {}),
      ...(verificationStatus ? { verificationStatus } : {}),
      ...(search
        ? {
            OR: [
              { id: { equals: search } },
              { email: { contains: search, mode: `insensitive` } },
              { personalDetails: { firstName: { contains: search, mode: `insensitive` } } },
              { personalDetails: { lastName: { contains: search, mode: `insensitive` } } },
              { organizationDetails: { name: { contains: search, mode: `insensitive` } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.consumerModel.findMany({
        where,
        orderBy: { createdAt: `desc` },
        skip,
        take: pageSize,
        select: {
          id: true,
          email: true,
          accountType: true,
          contractorKind: true,
          verificationStatus: true,
          stripeIdentityStatus: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          personalDetails: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          organizationDetails: {
            select: {
              name: true,
            },
          },
          adminFlags: {
            where: { removedAt: null },
            orderBy: { createdAt: `desc` },
            take: 3,
            select: {
              id: true,
              flag: true,
            },
          },
          _count: {
            select: {
              adminNotes: true,
              adminFlags: {
                where: { removedAt: null },
              },
            },
          },
        },
      }),
      this.prisma.consumerModel.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        displayName:
          item.organizationDetails?.name ??
          [item.personalDetails?.firstName, item.personalDetails?.lastName].filter(Boolean).join(` `) ??
          null,
        summary: {
          notesCount: item._count.adminNotes,
          activeFlagsCount: item._count.adminFlags,
          deleted: item.deletedAt != null,
        },
      })),
      total,
      page,
      pageSize,
    };
  }

  async getConsumerContracts(
    consumerId: string,
    params?: {
      page?: number;
      pageSize?: number;
      q?: string;
    },
  ) {
    await this.requireConsumer(consumerId);
    return this.consumerContractsService.getContracts(consumerId, params?.page, params?.pageSize, params?.q);
  }

  async getConsumerLedgerSummary(consumerId: string) {
    await this.requireConsumer(consumerId);
    const rows = await this.prisma.ledgerEntryModel.groupBy({
      by: [`currencyCode`, `status`],
      where: {
        consumerId,
        deletedAt: null,
      },
      _sum: {
        amount: true,
      },
      _count: {
        _all: true,
      },
    });

    const summary = rows.reduce<
      Record<string, { completedAmount: string; pendingAmount: string; completedCount: number; pendingCount: number }>
    >((acc, row) => {
      const key = row.currencyCode;
      const bucket = acc[key] ?? {
        completedAmount: `0`,
        pendingAmount: `0`,
        completedCount: 0,
        pendingCount: 0,
      };
      const amount = row._sum.amount?.toString() ?? `0`;
      if (row.status === $Enums.TransactionStatus.COMPLETED) {
        bucket.completedAmount = (Number(bucket.completedAmount) + Number(amount)).toFixed(2);
        bucket.completedCount += row._count._all;
      } else {
        bucket.pendingAmount = (Number(bucket.pendingAmount) + Number(amount)).toFixed(2);
        bucket.pendingCount += row._count._all;
      }
      acc[key] = bucket;
      return acc;
    }, {});

    return {
      consumerId,
      summary,
    };
  }

  async getConsumerAuthHistory(
    consumerId: string,
    params?: {
      page?: number;
      pageSize?: number;
      dateFrom?: Date;
      dateTo?: Date;
    },
  ) {
    const consumer = await this.requireConsumer(consumerId);
    const pagination = normalizePagination(params?.page, params?.pageSize);
    const createdAt = buildCreatedAtFilter(params?.dateFrom, params?.dateTo);
    const where = {
      identityType: AUTH_IDENTITY_TYPES.consumer,
      OR: [{ identityId: consumerId }, { email: consumer.email.toLowerCase() }],
      ...(createdAt ? { createdAt } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.authAuditLogModel.findMany({
        where,
        orderBy: { createdAt: `desc` },
        skip: pagination.skip,
        take: pagination.pageSize,
      }),
      this.prisma.authAuditLogModel.count({ where }),
    ]);

    return {
      items,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  async getConsumerActionLog(
    consumerId: string,
    params?: {
      page?: number;
      pageSize?: number;
      dateFrom?: Date;
      dateTo?: Date;
      action?: string;
    },
  ) {
    await this.requireConsumer(consumerId);
    const pagination = normalizePagination(params?.page, params?.pageSize);
    const dateTo = params?.dateTo ?? new Date();
    const dateFrom =
      params?.dateFrom ?? new Date(Date.now() - DEFAULT_CONSUMER_ACTION_RANGE_DAYS * 24 * 60 * 60 * 1000);
    const createdAt = buildCreatedAtFilter(dateFrom, dateTo);
    const where = {
      consumerId,
      ...(params?.action?.trim() ? { action: params.action.trim() } : {}),
      ...(createdAt ? { createdAt } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.consumerActionLogModel.findMany({
        where,
        orderBy: { createdAt: `desc` },
        skip: pagination.skip,
        take: pagination.pageSize,
      }),
      this.prisma.consumerActionLogModel.count({ where }),
    ]);

    return {
      items,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      dateFrom,
      dateTo,
    };
  }

  async getConsumerCase(consumerId: string) {
    const consumer = await this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      select: {
        id: true,
        email: true,
        accountType: true,
        contractorKind: true,
        verified: true,
        legalVerified: true,
        verificationStatus: true,
        verificationReason: true,
        verificationUpdatedAt: true,
        suspendedAt: true,
        suspendedBy: true,
        suspensionReason: true,
        stripeIdentityStatus: true,
        stripeIdentityLastErrorCode: true,
        stripeIdentityLastErrorReason: true,
        stripeIdentityStartedAt: true,
        stripeIdentityUpdatedAt: true,
        stripeIdentityVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        personalDetails: true,
        organizationDetails: true,
        addressDetails: true,
        googleProfileDetails: true,
        contacts: {
          where: { deletedAt: null },
          orderBy: { updatedAt: `desc` },
          take: 20,
          select: {
            id: true,
            email: true,
            name: true,
            updatedAt: true,
          },
        },
        paymentMethods: {
          where: { deletedAt: null },
          take: 10,
          orderBy: { createdAt: `desc` },
          select: {
            id: true,
            type: true,
            brand: true,
            last4: true,
            defaultSelected: true,
            createdAt: true,
            updatedAt: true,
            disabledAt: true,
          },
        },
        asPayerPaymentRequests: {
          where: { deletedAt: null },
          orderBy: [{ updatedAt: `desc` }, { createdAt: `desc` }],
          take: 5,
          select: {
            id: true,
            amount: true,
            currencyCode: true,
            status: true,
            paymentRail: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        asRequesterPaymentRequests: {
          where: { deletedAt: null },
          orderBy: [{ updatedAt: `desc` }, { createdAt: `desc` }],
          take: 5,
          select: {
            id: true,
            amount: true,
            currencyCode: true,
            status: true,
            paymentRail: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        consumerResources: {
          where: { deletedAt: null, resource: { deletedAt: null } },
          take: 20,
          orderBy: { createdAt: `desc` },
          select: {
            id: true,
            createdAt: true,
            resource: {
              select: {
                id: true,
                originalName: true,
                mimetype: true,
                size: true,
                downloadUrl: true,
                createdAt: true,
              },
            },
          },
        },
        adminNotes: {
          orderBy: { createdAt: `desc` },
          take: 20,
          select: {
            id: true,
            content: true,
            createdAt: true,
            admin: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
        adminFlags: {
          where: { removedAt: null },
          orderBy: { createdAt: `desc` },
          select: {
            id: true,
            flag: true,
            reason: true,
            version: true,
            createdAt: true,
            admin: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            contacts: true,
            paymentMethods: {
              where: { deletedAt: null },
            },
            asPayerPaymentRequests: {
              where: { deletedAt: null },
            },
            asRequesterPaymentRequests: {
              where: { deletedAt: null },
            },
            ledgerEntries: {
              where: { deletedAt: null },
            },
            consumerResources: {
              where: { deletedAt: null },
            },
            adminNotes: true,
            adminFlags: {
              where: { removedAt: null },
            },
          },
        },
      },
    });

    if (!consumer) {
      throw new NotFoundException(`Consumer not found`);
    }

    const [recentAuthEvents, recentAdminActions, recentConsumerActions, ledgerSummary] = await Promise.all([
      this.prisma.authAuditLogModel.findMany({
        where: {
          identityType: AUTH_IDENTITY_TYPES.consumer,
          OR: [{ identityId: consumerId }, { email: consumer.email.toLowerCase() }],
        },
        orderBy: { createdAt: `desc` },
        take: 10,
      }),
      this.prisma.adminActionAuditLogModel.findMany({
        where: {
          resource: `consumer`,
          resourceId: consumerId,
        },
        include: {
          admin: {
            select: {
              email: true,
            },
          },
        },
        orderBy: { createdAt: `desc` },
        take: 10,
      }),
      this.prisma.consumerActionLogModel.findMany({
        where: { consumerId },
        orderBy: { createdAt: `desc` },
        take: 10,
      }),
      this.getConsumerLedgerSummary(consumerId),
    ]);

    const recentPaymentRequests = [...consumer.asPayerPaymentRequests, ...consumer.asRequesterPaymentRequests]
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
      .slice(0, 10)
      .map((paymentRequest) => ({
        id: paymentRequest.id,
        amount: paymentRequest.amount.toString(),
        currencyCode: paymentRequest.currencyCode,
        status: normalizeConsumerFacingTransactionStatus(paymentRequest.status),
        paymentRail: paymentRequest.paymentRail,
        createdAt: paymentRequest.createdAt,
      }));

    return {
      ...consumer,
      paymentMethods: consumer.paymentMethods.map((paymentMethod) => ({
        ...paymentMethod,
        status: paymentMethod.disabledAt ? `DISABLED` : `ACTIVE`,
      })),
      recentPaymentRequests,
      ledgerSummary: ledgerSummary.summary,
      recentAuthEvents,
      recentAdminActions: recentAdminActions.map((row) => ({
        id: row.id,
        action: row.action,
        resource: row.resource,
        resourceId: row.resourceId,
        metadata: row.metadata,
        createdAt: row.createdAt,
        adminId: row.adminId,
        adminEmail: row.admin?.email ?? null,
      })),
      recentConsumerActions,
    };
  }

  async createNote(consumerId: string, adminId: string, content: string, meta?: RequestMeta) {
    const normalizedContent = content.trim();
    if (!normalizedContent) {
      throw new BadRequestException(`Note content is required`);
    }
    if (normalizedContent.length > NOTE_MAX_LEN) {
      throw new BadRequestException(`Note content is too long`);
    }

    return this.prisma.$transaction(async (tx) => {
      const note = await tx.consumerAdminNoteModel.create({
        data: {
          consumerId,
          adminId,
          content: normalizedContent,
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
        },
      });

      await tx.adminActionAuditLogModel.create({
        data: {
          adminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.consumer_note_create,
          resource: `consumer`,
          resourceId: consumerId,
          metadata: { noteId: note.id },
          ipAddress: meta?.ipAddress ?? null,
          userAgent: meta?.userAgent ?? null,
        },
      });

      return note;
    });
  }

  async addFlag(consumerId: string, adminId: string, flag: string, reason?: string | null, meta?: RequestMeta) {
    const normalizedFlag = normalizeFlag(flag);
    if (!normalizedFlag) {
      throw new BadRequestException(`Flag is required`);
    }

    const normalizedReason = reason?.trim() ? reason.trim().slice(0, REASON_MAX_LEN) : null;
    const existing = await this.prisma.consumerFlagModel.findFirst({
      where: {
        consumerId,
        flag: normalizedFlag,
        removedAt: null,
      },
      select: {
        id: true,
        flag: true,
        reason: true,
        version: true,
        createdAt: true,
      },
    });
    if (existing) {
      return { ...existing, alreadyExisted: true };
    }

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.consumerFlagModel.create({
        data: {
          consumerId,
          adminId,
          flag: normalizedFlag,
          reason: normalizedReason,
        },
        select: {
          id: true,
          flag: true,
          reason: true,
          version: true,
          createdAt: true,
        },
      });

      await tx.adminActionAuditLogModel.create({
        data: {
          adminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.consumer_flag_add,
          resource: `consumer`,
          resourceId: consumerId,
          metadata: { flagId: created.id, flag: normalizedFlag, reason: normalizedReason },
          ipAddress: meta?.ipAddress ?? null,
          userAgent: meta?.userAgent ?? null,
        },
      });

      return created;
    });
  }

  async removeFlag(consumerId: string, flagId: string, adminId: string, version: number, meta?: RequestMeta) {
    if (!Number.isFinite(version) || version < 1) {
      throw new BadRequestException(`Valid version is required`);
    }

    return this.prisma.$transaction(async (tx) => {
      const flag = await tx.consumerFlagModel.findFirst({
        where: {
          id: flagId,
          consumerId,
        },
        select: {
          id: true,
          flag: true,
          version: true,
          removedAt: true,
        },
      });

      if (!flag) {
        throw new NotFoundException(`Flag not found`);
      }
      if (flag.removedAt) {
        return { id: flag.id, alreadyRemoved: true };
      }
      if (flag.version !== version) {
        throw new ConflictException({
          error: `STALE_VERSION`,
          message: `Resource has been modified by another operator`,
          currentVersion: flag.version,
          recommendedAction: `reload`,
        });
      }

      const removedAt = new Date();
      const updated = await tx.consumerFlagModel.update({
        where: { id: flagId },
        data: {
          removedAt,
          removedBy: adminId,
          version: { increment: 1 },
        },
        select: {
          id: true,
          flag: true,
          version: true,
          removedAt: true,
        },
      });

      await tx.adminActionAuditLogModel.create({
        data: {
          adminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.consumer_flag_remove,
          resource: `consumer`,
          resourceId: consumerId,
          metadata: { flagId, flag: flag.flag, removedAt },
          ipAddress: meta?.ipAddress ?? null,
          userAgent: meta?.userAgent ?? null,
        },
      });

      return updated;
    });
  }

  async forceLogout(consumerId: string, adminId: string, body: { confirmed?: boolean }, meta?: RequestMeta) {
    if (body.confirmed !== true) {
      throw new BadRequestException(`Confirmation is required for force logout`);
    }
    const consumer = await this.requireConsumer(consumerId);
    return this.idempotency.execute({
      adminId,
      scope: `consumer-force-logout:${consumerId}`,
      key: meta?.idempotencyKey,
      payload: { consumerId, confirmed: true },
      execute: async () => {
        const activeSessionsBefore = await this.prisma.authSessionModel.count({
          where: { consumerId, revokedAt: null },
        });
        await this.consumerAuthService.revokeAllSessionsByConsumerIdAndAudit(consumerId, {
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        });
        await this.adminActionAudit.record({
          adminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.consumer_force_logout,
          resource: `consumer`,
          resourceId: consumerId,
          metadata: { activeSessionsBefore, consumerEmail: consumer.email },
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        });
        return {
          consumerId,
          revokedSessionsCount: activeSessionsBefore,
          alreadyRevoked: activeSessionsBefore === 0,
        };
      },
    });
  }

  async suspendConsumer(consumerId: string, adminId: string, body: SuspendConsumerBody, meta?: RequestMeta) {
    if (body.confirmed !== true) {
      throw new BadRequestException(`Confirmation is required for consumer suspension`);
    }

    const reason = body.reason?.trim();
    if (!reason) {
      throw new BadRequestException(`Suspension reason is required`);
    }
    if (reason.length > REASON_MAX_LEN) {
      throw new BadRequestException(`Suspension reason is too long`);
    }

    const consumer = await this.requireConsumer(consumerId);
    return this.idempotency.execute({
      adminId,
      scope: `consumer-suspend:${consumerId}`,
      key: meta?.idempotencyKey,
      payload: { consumerId, confirmed: true, reason },
      execute: async () => {
        if (consumer.suspendedAt != null) {
          return {
            consumerId,
            suspendedAt: consumer.suspendedAt,
            alreadySuspended: true,
            emailDispatched: false,
          };
        }

        const suspendedAt = new Date();
        await this.prisma.consumerModel.update({
          where: { id: consumerId },
          data: {
            suspendedAt,
            suspendedBy: adminId,
            suspensionReason: reason,
          },
        });

        await this.consumerAuthService.revokeAllSessionsByConsumerIdAndAudit(consumerId, {
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        });

        const emailDispatched = await this.consumerAuthService.sendConsumerSuspensionEmail(consumerId, reason);
        if (!emailDispatched) {
          throw new ConflictException(`Failed to dispatch suspension email`);
        }

        await this.adminActionAudit.record({
          adminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.consumer_suspend,
          resource: `consumer`,
          resourceId: consumerId,
          metadata: {
            consumerEmail: consumer.email,
            reason,
            suspendedAt,
            emailKind: `consumer_suspension`,
          },
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        });

        return {
          consumerId,
          suspendedAt,
          alreadySuspended: false,
          emailDispatched,
        };
      },
    });
  }

  async resendConsumerEmail(consumerId: string, adminId: string, body: ResendConsumerEmailBody, meta?: RequestMeta) {
    const consumer = await this.requireConsumer(consumerId);

    let result:
      | { requestedKind: `signup_verification`; dispatchedKind: `signup_verification`; emailDispatched: boolean }
      | {
          requestedKind: `password_recovery`;
          dispatchedKind: `password_reset` | `google_signin_recovery`;
          emailDispatched: boolean;
        };

    if (body.emailKind === `signup_verification`) {
      const emailDispatched = await this.consumerAuthService.resendSignupVerificationEmail(consumerId, body.appScope);
      if (!emailDispatched) {
        throw new ConflictException(`Failed to dispatch signup verification email`);
      }
      result = {
        requestedKind: `signup_verification`,
        dispatchedKind: `signup_verification`,
        emailDispatched,
      };
    } else {
      const outcome = await this.consumerAuthService.resendPasswordRecoveryEmail(consumerId, body.appScope);
      result = {
        ...outcome,
        emailDispatched: true,
      };
    }

    await this.adminActionAudit.record({
      adminId,
      action: ADMIN_ACTION_AUDIT_ACTIONS.consumer_email_resend,
      resource: `consumer`,
      resourceId: consumerId,
      metadata: {
        consumerEmail: consumer.email,
        requestedEmailKind: result.requestedKind,
        dispatchedEmailKind: result.dispatchedKind,
        appScope: body.appScope,
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return {
      consumerId,
      ...result,
    };
  }
}
