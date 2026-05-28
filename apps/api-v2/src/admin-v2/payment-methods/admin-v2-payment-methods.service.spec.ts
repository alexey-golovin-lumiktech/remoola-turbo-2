import { describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, ConflictException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { type AdminV2PaymentMethodsQuery } from './admin-v2-payment-methods.query';
import { type AdminV2PaymentMethodsRepository } from './admin-v2-payment-methods.repository';
import { AdminV2PaymentMethodsService } from './admin-v2-payment-methods.service';

describe(`AdminV2PaymentMethodsService`, () => {
  function buildService() {
    const query = {
      listPaymentMethods: jest.fn<(...a: any[]) => any>(),
      getPaymentMethodCase: jest.fn<(...a: any[]) => any>(),
      listFingerprintDuplicates: jest.fn<(...a: any[]) => any>(),
    };
    const repository = {
      getPaymentMethodForMutation: jest.fn<(...a: any[]) => any>(),
      listFingerprintDuplicateIds: jest.fn<(...a: any[]) => any>(),
      disablePaymentMethod: jest.fn<(...a: any[]) => any>(),
      removeDefaultPaymentMethod: jest.fn<(...a: any[]) => any>(),
      escalateDuplicatePaymentMethod: jest.fn<(...a: any[]) => any>(),
    };
    const idempotency = {
      execute: jest.fn<(...a: any[]) => any>(async ({ execute }: { execute: () => Promise<unknown> }) => execute()),
    };

    return {
      service: new AdminV2PaymentMethodsService(
        query as unknown as AdminV2PaymentMethodsQuery,
        repository as unknown as AdminV2PaymentMethodsRepository,
        idempotency as never,
      ),
      query,
      repository,
      idempotency,
    };
  }

  it(`maps list results returned by the query collaborator`, async () => {
    const { service, query } = buildService();
    query.listPaymentMethods.mockResolvedValueOnce({
      items: [
        {
          id: `pm-1`,
          type: $Enums.PaymentMethodType.BANK_ACCOUNT,
          brand: null,
          last4: null,
          bankLast4: `6789`,
          defaultSelected: true,
          stripeFingerprint: `fp-1`,
          disabledAt: null,
          createdAt: new Date(`2026-04-16T08:00:00.000Z`),
          updatedAt: new Date(`2026-04-16T09:00:00.000Z`),
          deletedAt: null,
          consumer: { id: `consumer-1`, email: `owner@example.com` },
        },
      ],
      total: 1,
      page: 2,
      pageSize: 10,
    });

    const result = await service.listPaymentMethods({
      page: 2,
      pageSize: 10,
      consumerId: `consumer-1`,
    });

    expect(query.listPaymentMethods).toHaveBeenCalledWith({
      page: 2,
      pageSize: 10,
      consumerId: `consumer-1`,
    });
    expect(result).toEqual({
      items: [
        {
          id: `pm-1`,
          type: `BANK_ACCOUNT`,
          brand: null,
          last4: null,
          bankLast4: `6789`,
          defaultSelected: true,
          stripeFingerprint: `fp-1`,
          status: `ACTIVE`,
          disabledAt: null,
          createdAt: `2026-04-16T08:00:00.000Z`,
          updatedAt: `2026-04-16T09:00:00.000Z`,
          deletedAt: null,
          consumer: { id: `consumer-1`, email: `owner@example.com` },
        },
      ],
      total: 1,
      page: 2,
      pageSize: 10,
    });
  });

  it(`returns only schema-backed detail fields and fingerprint duplicates`, async () => {
    const { service, query } = buildService();
    query.getPaymentMethodCase.mockResolvedValueOnce({
      id: `pm-1`,
      type: $Enums.PaymentMethodType.CREDIT_CARD,
      stripePaymentMethodId: `stripe-pm-1`,
      stripeFingerprint: `fp-shared`,
      defaultSelected: true,
      disabledBy: `admin-9`,
      disabledAt: new Date(`2026-04-16T09:30:00.000Z`),
      brand: `Visa`,
      last4: `4242`,
      expMonth: `04`,
      expYear: `2030`,
      bankName: null,
      bankLast4: null,
      bankCountry: null,
      bankCurrency: null,
      serviceFee: 0,
      createdAt: new Date(`2026-04-16T08:00:00.000Z`),
      updatedAt: new Date(`2026-04-16T09:00:00.000Z`),
      deletedAt: new Date(`2026-04-16T10:00:00.000Z`),
      consumer: { id: `consumer-1`, email: `owner@example.com` },
      billingDetails: {
        id: `billing-1`,
        email: `billing@example.com`,
        name: `Owner`,
        phone: `+10000000000`,
        deletedAt: null,
      },
      duplicateEscalations: [
        {
          id: `esc-1`,
          fingerprint: `fp-shared`,
          duplicateCount: 2,
          duplicatePaymentMethodIds: [`pm-2`],
          createdAt: new Date(`2026-04-16T11:00:00.000Z`),
          escalatedByAdmin: {
            id: `admin-2`,
            email: `super@example.com`,
          },
        },
      ],
    });
    query.listFingerprintDuplicates.mockResolvedValueOnce([
      {
        id: `pm-2`,
        type: $Enums.PaymentMethodType.CREDIT_CARD,
        brand: `Visa`,
        last4: `1111`,
        bankLast4: null,
        defaultSelected: false,
        createdAt: new Date(`2026-04-15T08:00:00.000Z`),
        deletedAt: null,
        consumer: { id: `consumer-2`, email: `other@example.com` },
      },
    ]);

    const paymentMethod = await service.getPaymentMethodCase(`pm-1`);

    expect(query.getPaymentMethodCase).toHaveBeenCalledWith(`pm-1`);
    expect(query.listFingerprintDuplicates).toHaveBeenCalledWith(`fp-shared`, `pm-1`);
    expect(paymentMethod.fingerprintDuplicates).toHaveLength(1);
    expect(paymentMethod.duplicateEscalation?.id).toBe(`esc-1`);
    expect(paymentMethod.status).toBe(`DISABLED`);
  });

  it(`does not invent fingerprint duplicate rows when fingerprint is absent`, async () => {
    const { service, query } = buildService();
    query.getPaymentMethodCase.mockResolvedValueOnce({
      id: `pm-bank-1`,
      type: $Enums.PaymentMethodType.BANK_ACCOUNT,
      stripePaymentMethodId: null,
      stripeFingerprint: null,
      defaultSelected: false,
      disabledBy: null,
      disabledAt: null,
      brand: null,
      last4: null,
      expMonth: null,
      expYear: null,
      bankName: `Bank`,
      bankLast4: `6789`,
      bankCountry: `US`,
      bankCurrency: $Enums.CurrencyCode.USD,
      serviceFee: 0,
      createdAt: new Date(`2026-04-16T08:00:00.000Z`),
      updatedAt: new Date(`2026-04-16T09:00:00.000Z`),
      deletedAt: null,
      consumer: { id: `consumer-1`, email: `owner@example.com` },
      billingDetails: null,
      duplicateEscalations: [],
    });

    const paymentMethod = await service.getPaymentMethodCase(`pm-bank-1`);

    expect(query.listFingerprintDuplicates).not.toHaveBeenCalled();
    expect(paymentMethod.fingerprintDuplicates).toEqual([]);
    expect(paymentMethod.duplicateEscalation).toBeNull();
  });

  it(`requires confirmation and reason for disable`, async () => {
    const { service } = buildService();

    await expect(
      service.disablePaymentMethod(`pm-1`, `admin-1`, { version: 1, confirmed: false, reason: `risk` }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.disablePaymentMethod(`pm-1`, `admin-1`, { version: 1, confirmed: true, reason: ` ` }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it(`routes disable through isolated idempotency scope and repository persistence`, async () => {
    const { service, repository, idempotency } = buildService();
    repository.getPaymentMethodForMutation.mockResolvedValueOnce({
      id: `pm-1`,
      consumerId: `consumer-1`,
      defaultSelected: true,
      disabledAt: null,
      deletedAt: null,
      updatedAt: new Date(`2026-04-16T09:00:00.000Z`),
      stripeFingerprint: `fp-shared`,
    });
    repository.disablePaymentMethod.mockResolvedValueOnce({
      paymentMethodId: `pm-1`,
      consumerId: `consumer-1`,
      status: `DISABLED`,
      defaultSelected: false,
      disabledAt: `2026-04-16T10:00:00.000Z`,
      version: new Date(`2026-04-16T10:00:00.000Z`).getTime(),
      alreadyDisabled: false,
      defaultCleared: true,
    });

    const result = await service.disablePaymentMethod(
      `pm-1`,
      `admin-1`,
      { version: new Date(`2026-04-16T09:00:00.000Z`).getTime(), confirmed: true, reason: `Fraud signal` },
      { idempotencyKey: `idem-1`, ipAddress: `127.0.0.1`, userAgent: `jest` },
    );

    expect(idempotency.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: `admin-1`,
        scope: `payment-method-disable:pm-1`,
        key: `idem-1`,
      }),
    );
    expect(repository.disablePaymentMethod).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentMethod: expect.objectContaining({ id: `pm-1` }),
        adminId: `admin-1`,
        reason: `Fraud signal`,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        paymentMethodId: `pm-1`,
        consumerId: `consumer-1`,
        status: `DISABLED`,
      }),
    );
  });

  it(`treats remove-default as idempotent when the marker is already absent`, async () => {
    const { service, repository } = buildService();
    repository.getPaymentMethodForMutation.mockResolvedValueOnce({
      id: `pm-1`,
      consumerId: `consumer-1`,
      defaultSelected: false,
      disabledAt: null,
      deletedAt: null,
      updatedAt: new Date(`2026-04-16T09:00:00.000Z`),
      stripeFingerprint: null,
    });

    const result = await service.removeDefaultPaymentMethod(`pm-1`, `admin-1`, {
      version: new Date(`2026-04-16T09:00:00.000Z`).getTime(),
    });

    expect(repository.removeDefaultPaymentMethod).not.toHaveBeenCalled();
    expect(result).toEqual({
      paymentMethodId: `pm-1`,
      consumerId: `consumer-1`,
      defaultSelected: false,
      status: `ACTIVE`,
      version: new Date(`2026-04-16T09:00:00.000Z`).getTime(),
      alreadyNotDefault: true,
    });
  });

  it(`rejects duplicate escalation without a real fingerprint cohort`, async () => {
    const { service, repository } = buildService();
    repository.getPaymentMethodForMutation.mockResolvedValueOnce({
      id: `pm-1`,
      consumerId: `consumer-1`,
      stripeFingerprint: null,
      defaultSelected: false,
      disabledAt: null,
      deletedAt: null,
      updatedAt: new Date(`2026-04-16T09:00:00.000Z`),
    });

    await expect(
      service.escalateDuplicatePaymentMethod(`pm-1`, `admin-1`, {
        version: new Date(`2026-04-16T09:00:00.000Z`).getTime(),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it(`rejects duplicate escalation when there are no matching duplicates`, async () => {
    const { service, repository } = buildService();
    repository.getPaymentMethodForMutation.mockResolvedValueOnce({
      id: `pm-1`,
      consumerId: `consumer-1`,
      stripeFingerprint: `fp-shared`,
      defaultSelected: false,
      disabledAt: null,
      deletedAt: null,
      updatedAt: new Date(`2026-04-16T09:00:00.000Z`),
    });
    repository.listFingerprintDuplicateIds.mockResolvedValueOnce([]);

    await expect(
      service.escalateDuplicatePaymentMethod(`pm-1`, `admin-1`, {
        version: new Date(`2026-04-16T09:00:00.000Z`).getTime(),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it(`delegates duplicate escalation persistence to the repository`, async () => {
    const { service, repository } = buildService();
    repository.getPaymentMethodForMutation.mockResolvedValueOnce({
      id: `pm-1`,
      consumerId: `consumer-1`,
      stripeFingerprint: `fp-shared`,
      defaultSelected: false,
      disabledAt: null,
      deletedAt: null,
      updatedAt: new Date(`2026-04-16T09:00:00.000Z`),
    });
    repository.listFingerprintDuplicateIds.mockResolvedValueOnce([`pm-2`, `pm-3`]);
    repository.escalateDuplicatePaymentMethod.mockResolvedValueOnce({
      paymentMethodId: `pm-1`,
      consumerId: `consumer-1`,
      escalationId: `esc-1`,
      fingerprint: `fp-shared`,
      duplicateCount: 3,
      duplicatePaymentMethodIds: [`pm-2`, `pm-3`],
      createdAt: `2026-04-16T10:00:00.000Z`,
      alreadyEscalated: false,
    });

    const result = await service.escalateDuplicatePaymentMethod(`pm-1`, `admin-1`, {
      version: new Date(`2026-04-16T09:00:00.000Z`).getTime(),
    });

    expect(repository.escalateDuplicatePaymentMethod).toHaveBeenCalledWith(
      expect.objectContaining({
        fingerprint: `fp-shared`,
        duplicatePaymentMethodIds: [`pm-2`, `pm-3`],
        expectedVersion: new Date(`2026-04-16T09:00:00.000Z`).getTime(),
      }),
    );
    expect(result.escalationId).toBe(`esc-1`);
  });
});
