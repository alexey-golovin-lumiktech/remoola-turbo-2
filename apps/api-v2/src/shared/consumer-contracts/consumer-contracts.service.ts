import { Injectable, NotFoundException } from '@nestjs/common';

import { errorCodes } from '@remoola/shared-constants';

import {
  buildContractDocuments,
  getLatestRelationshipPayment,
  getOperatingRelationshipPayment,
  mapContractPayment,
  normalizeEmail,
} from './consumer-contract-mapper';
import {
  normalizeContractPresenceFilter,
  normalizeContractSort,
  normalizeContractStatusFilter,
} from './consumer-contract-normalizers';
import { ConsumerContractsQuery } from './consumer-contracts.query';
import { ConsumerContractDetails, ConsumerContractItem } from './dto';

@Injectable()
export class ConsumerContractsService {
  constructor(private readonly contractsQuery: ConsumerContractsQuery) {}

  async getContracts(
    consumerId: string,
    page = 1,
    pageSize = 10,
    query?: string,
    status?: string,
    hasDocuments?: string,
    hasPayments?: string,
    sort?: string,
  ): Promise<{ items: ConsumerContractItem[]; total: number; page: number; pageSize: number }> {
    const safePage = Math.max(1, Math.floor(Number(page)) || 1);
    const safePageSize = Math.min(100, Math.max(1, Math.floor(Number(pageSize)) || 10));
    const term = query?.trim() ?? ``;
    const normalizedStatusFilter = normalizeContractStatusFilter(status);
    const normalizedHasDocumentsFilter = normalizeContractPresenceFilter(hasDocuments);
    const normalizedHasPaymentsFilter = normalizeContractPresenceFilter(hasPayments);
    const normalizedSort = normalizeContractSort(sort);
    return this.contractsQuery.getContractsRaw({
      consumerId,
      safePage,
      safePageSize,
      term,
      normalizedStatusFilter,
      normalizedHasDocumentsFilter,
      normalizedHasPaymentsFilter,
      normalizedSort,
    });
  }

  async getDetails(id: string, consumerId: string, backendBaseUrl?: string): Promise<ConsumerContractDetails> {
    const contact = await this.contractsQuery.findContactForDetails(id, consumerId);

    if (!contact) {
      throw new NotFoundException(errorCodes.CONTACT_NOT_FOUND);
    }

    const consumerEmail = await this.contractsQuery.getConsumerEmail(consumerId);

    const paymentRequests = await this.contractsQuery.findPaymentRequestsForDetails(
      consumerId,
      normalizeEmail(contact.email),
      consumerEmail,
    );

    const payments = paymentRequests.map((paymentRequest) =>
      mapContractPayment(consumerId, contact.email, paymentRequest),
    );
    const documents = buildContractDocuments(paymentRequests, backendBaseUrl);
    const latestPayment = getLatestRelationshipPayment(payments);
    const operatingPayment = getOperatingRelationshipPayment(payments);

    return {
      id: contact.id,
      name: contact.name,
      email: contact.email,
      updatedAt: contact.updatedAt,
      address: JSON.parse(JSON.stringify(contact.address)),
      summary: {
        lastStatus: operatingPayment?.status ?? null,
        lastActivity: latestPayment?.updatedAt ?? null,
        lastRequestId: operatingPayment?.id ?? null,
        documentsCount: documents.length,
        paymentsCount: payments.length,
        completedPaymentsCount: payments.filter((payment) => payment.status === `completed`).length,
        draftPaymentsCount: payments.filter((payment) => payment.status === `draft`).length,
        pendingPaymentsCount: payments.filter((payment) => payment.status === `pending`).length,
        waitingPaymentsCount: payments.filter((payment) => payment.status === `waiting`).length,
      },
      payments,
      documents,
    };
  }
}
