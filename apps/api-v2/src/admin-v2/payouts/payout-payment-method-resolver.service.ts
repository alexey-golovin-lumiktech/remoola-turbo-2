import { Injectable } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import { AdminV2PayoutsRepository } from './admin-v2-payouts.repository';

export type PayoutPaymentMethodEntry = {
  consumerId: string;
  metadata?: Prisma.JsonValue | null;
};

export type PaymentMethodSummaryRow = {
  id: string;
  consumerId: string;
  type: $Enums.PaymentMethodType;
  brand: string | null;
  last4: string | null;
  bankLast4: string | null;
  deletedAt: Date | null;
};

export type DestinationPaymentMethodOverlay =
  | {
      destinationPaymentMethodSummary: null;
      destinationAvailability: `unavailable`;
      destinationLinkageSource: null;
    }
  | {
      destinationPaymentMethodSummary: {
        id: string;
        type: $Enums.PaymentMethodType;
        brand: string | null;
        last4: string | null;
        bankLast4: string | null;
        deletedAt: string | null;
      };
      destinationAvailability: `linked`;
      destinationLinkageSource: `metadata.paymentMethodId`;
    };

@Injectable()
export class PayoutPaymentMethodResolverService {
  constructor(private readonly payoutsQuery: AdminV2PayoutsRepository) {}

  async getPaymentMethodsById(entries: PayoutPaymentMethodEntry[]): Promise<Map<string, PaymentMethodSummaryRow>> {
    const paymentMethodIds = Array.from(
      new Set(
        entries.map((entry) => this.getPaymentMethodId(entry.metadata)).filter((id): id is string => Boolean(id)),
      ),
    );

    if (paymentMethodIds.length === 0) {
      return new Map<string, PaymentMethodSummaryRow>();
    }

    const paymentMethods = await this.payoutsQuery.fetchPaymentMethodsByIds(paymentMethodIds);

    return new Map(paymentMethods.map((paymentMethod) => [paymentMethod.id, paymentMethod]));
  }

  resolveDestination(
    entry: PayoutPaymentMethodEntry,
    paymentMethodsById: Map<string, PaymentMethodSummaryRow>,
  ): DestinationPaymentMethodOverlay {
    const paymentMethodId = this.getPaymentMethodId(entry.metadata);
    if (!paymentMethodId) {
      return this.unavailableDestination();
    }

    const paymentMethod = paymentMethodsById.get(paymentMethodId);
    if (!paymentMethod || paymentMethod.consumerId !== entry.consumerId) {
      return this.unavailableDestination();
    }

    return {
      destinationPaymentMethodSummary: {
        id: paymentMethod.id,
        type: paymentMethod.type,
        brand: paymentMethod.brand,
        last4: paymentMethod.last4,
        bankLast4: paymentMethod.bankLast4,
        deletedAt: paymentMethod.deletedAt?.toISOString() ?? null,
      },
      destinationAvailability: `linked`,
      destinationLinkageSource: `metadata.paymentMethodId`,
    };
  }

  private getPaymentMethodId(metadata: Prisma.JsonValue | null | undefined): string | null {
    const parsed = this.parseMetadata(metadata);
    return typeof parsed.paymentMethodId === `string` && parsed.paymentMethodId.trim()
      ? parsed.paymentMethodId.trim()
      : null;
  }

  private parseMetadata(metadata: Prisma.JsonValue | null | undefined): Record<string, unknown> {
    return JSON.parse(JSON.stringify(metadata ?? {})) as Record<string, unknown>;
  }

  private unavailableDestination(): DestinationPaymentMethodOverlay {
    return {
      destinationPaymentMethodSummary: null,
      destinationAvailability: `unavailable`,
      destinationLinkageSource: null,
    };
  }
}
