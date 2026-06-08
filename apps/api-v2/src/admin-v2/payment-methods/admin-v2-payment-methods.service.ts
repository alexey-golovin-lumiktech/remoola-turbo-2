import { Injectable, NotFoundException } from '@nestjs/common';

import {
  deriveStatus,
  deriveVersion,
  mapBillingDetails,
  mapConsumer,
  toNullableIso,
} from './admin-v2-payment-methods-mappers';
import {
  assertDuplicateEscalationCohort,
  assertPaymentMethodDisableAllowed,
  assertPaymentMethodMutationTargetFound,
  assertPaymentMethodMutationTargetVersion,
  assertPaymentMethodRemoveDefaultAllowed,
  buildAlreadyDisabledPaymentMethodResult,
  buildAlreadyNotDefaultPaymentMethodResult,
  requireDisablePaymentMethodConfirmation,
  requireDisablePaymentMethodReason,
  requireDuplicateEscalationFingerprint,
  requirePaymentMethodMutationVersion,
} from './admin-v2-payment-methods-mutation-policy';
import { AdminV2PaymentMethodsQuery } from './admin-v2-payment-methods.query';
import {
  AdminV2PaymentMethodsRepository,
  type AdminV2PaymentMethodsRequestMeta as RequestMeta,
} from './admin-v2-payment-methods.repository';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';

@Injectable()
export class AdminV2PaymentMethodsService {
  constructor(
    private readonly query: AdminV2PaymentMethodsQuery,
    private readonly repository: AdminV2PaymentMethodsRepository,
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
    const { items, total, page, pageSize } = await this.query.listPaymentMethods(params);

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
    const paymentMethod = await this.query.getPaymentMethodCase(id);

    if (!paymentMethod) {
      throw new NotFoundException(`Payment method not found`);
    }

    const fingerprintDuplicates = paymentMethod.stripeFingerprint
      ? await this.query.listFingerprintDuplicates(paymentMethod.stripeFingerprint, paymentMethod.id)
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
    requireDisablePaymentMethodConfirmation(body.confirmed);
    const reason = requireDisablePaymentMethodReason(body.reason);
    const expectedVersion = requirePaymentMethodMutationVersion(body.version);

    return this.idempotency.execute({
      adminId,
      scope: `payment-method-disable:${id}`,
      key: meta?.idempotencyKey,
      payload: { paymentMethodId: id, version: expectedVersion, confirmed: true, reason },
      execute: async () => {
        const paymentMethod = await this.repository.getPaymentMethodForMutation(id);

        assertPaymentMethodMutationTargetFound(paymentMethod);
        assertPaymentMethodMutationTargetVersion(paymentMethod, expectedVersion);
        assertPaymentMethodDisableAllowed(paymentMethod);
        if (paymentMethod.disabledAt) {
          return buildAlreadyDisabledPaymentMethodResult(paymentMethod);
        }

        return this.repository.disablePaymentMethod({
          paymentMethod,
          adminId,
          reason,
          meta,
        });
      },
    });
  }

  async removeDefaultPaymentMethod(id: string, adminId: string, body: { version?: number }, meta?: RequestMeta) {
    const expectedVersion = requirePaymentMethodMutationVersion(body.version);

    return this.idempotency.execute({
      adminId,
      scope: `payment-method-remove-default:${id}`,
      key: meta?.idempotencyKey,
      payload: { paymentMethodId: id, version: expectedVersion },
      execute: async () => {
        const paymentMethod = await this.repository.getPaymentMethodForMutation(id);

        assertPaymentMethodMutationTargetFound(paymentMethod);
        assertPaymentMethodMutationTargetVersion(paymentMethod, expectedVersion);
        assertPaymentMethodRemoveDefaultAllowed(paymentMethod);
        if (!paymentMethod.defaultSelected) {
          return buildAlreadyNotDefaultPaymentMethodResult(paymentMethod);
        }

        return this.repository.removeDefaultPaymentMethod({
          paymentMethod,
          adminId,
          meta,
        });
      },
    });
  }

  async escalateDuplicatePaymentMethod(id: string, adminId: string, body: { version?: number }, meta?: RequestMeta) {
    const expectedVersion = requirePaymentMethodMutationVersion(body.version);

    return this.idempotency.execute({
      adminId,
      scope: `payment-method-duplicate-escalate:${id}`,
      key: meta?.idempotencyKey,
      payload: { paymentMethodId: id, version: expectedVersion },
      execute: async () => {
        const paymentMethod = await this.repository.getPaymentMethodForMutation(id);

        assertPaymentMethodMutationTargetFound(paymentMethod);
        assertPaymentMethodMutationTargetVersion(paymentMethod, expectedVersion);
        const fingerprint = requireDuplicateEscalationFingerprint(paymentMethod);

        const duplicatePaymentMethodIds = await this.repository.listFingerprintDuplicateIds(
          fingerprint,
          paymentMethod.id,
        );
        assertDuplicateEscalationCohort(duplicatePaymentMethodIds);

        return this.repository.escalateDuplicatePaymentMethod({
          paymentMethod: {
            id: paymentMethod.id,
            consumerId: paymentMethod.consumerId,
            updatedAt: paymentMethod.updatedAt,
          },
          fingerprint,
          duplicatePaymentMethodIds,
          expectedVersion,
          adminId,
          meta,
        });
      },
    });
  }
}
