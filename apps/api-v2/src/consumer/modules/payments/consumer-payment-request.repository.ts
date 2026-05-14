import { Injectable } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { type CreatePaymentRequest } from './dto';
import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class ConsumerPaymentRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  createDraftPaymentRequest(params: {
    consumerId: string;
    normalizedEmail: string;
    recipient: { id: string; email: string | null } | null;
    body: CreatePaymentRequest;
    dueDate: Date | null;
  }) {
    return this.prisma.paymentRequestModel.create({
      data: {
        payerId: params.recipient?.id ?? null,
        payerEmail: params.recipient?.email ?? params.normalizedEmail,
        requesterId: params.consumerId,
        currencyCode: params.body.currencyCode ?? $Enums.CurrencyCode.USD,
        amount: Number(params.body.amount),
        description: params.body.description ?? null,
        dueDate: params.dueDate,
        status: $Enums.TransactionStatus.DRAFT,
        createdBy: params.consumerId,
        updatedBy: params.consumerId,
      },
    });
  }
}
