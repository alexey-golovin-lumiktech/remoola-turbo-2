import { Injectable } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import { normalizeEnumValue, normalizePage, normalizePageSize } from './admin-v2-payment-methods-mappers';
import { PrismaService } from '../../shared/prisma.service';

const listPaymentMethodSelect = Prisma.validator<Prisma.PaymentMethodModelSelect>()({
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
});

const paymentMethodCaseSelect = Prisma.validator<Prisma.PaymentMethodModelSelect>()({
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
});

const paymentMethodDuplicateSelect = Prisma.validator<Prisma.PaymentMethodModelSelect>()({
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
});

@Injectable()
export class AdminV2PaymentMethodsQuery {
  constructor(private readonly prisma: PrismaService) {}

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
        select: listPaymentMethodSelect,
      }),
      this.prisma.paymentMethodModel.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  getPaymentMethodCase(id: string) {
    return this.prisma.paymentMethodModel.findFirst({
      where: { id },
      select: paymentMethodCaseSelect,
    });
  }

  listFingerprintDuplicates(fingerprint: string, paymentMethodId: string) {
    return this.prisma.paymentMethodModel.findMany({
      where: {
        stripeFingerprint: fingerprint,
        id: { not: paymentMethodId },
      },
      orderBy: [{ createdAt: `desc` }, { id: `desc` }],
      select: paymentMethodDuplicateSelect,
    });
  }
}
