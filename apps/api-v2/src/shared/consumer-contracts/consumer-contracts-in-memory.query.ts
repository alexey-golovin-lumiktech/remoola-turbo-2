import { Injectable } from '@nestjs/common';

import {
  countUniqueAttachmentResources,
  getLatestRelationshipPayment,
  getOperatingRelationshipPayment,
  mapContractListPayment,
  normalizeEmail,
} from './consumer-contract-mapper';
import {
  type ContractPresenceFilter,
  type ContractSortOption,
  type ContractStatusFilter,
  matchesContractPresenceFilter,
  matchesContractStatusFilter,
} from './consumer-contract-normalizers';
import { ConsumerContractsQuery } from './consumer-contracts.query';
import { type ConsumerContractItem } from './dto';

type ConsumerContractsInMemoryParams = {
  consumerId: string;
  safePage: number;
  safePageSize: number;
  term: string;
  normalizedStatusFilter: ContractStatusFilter | null;
  normalizedHasDocumentsFilter: ContractPresenceFilter | null;
  normalizedHasPaymentsFilter: ContractPresenceFilter | null;
  normalizedSort: ContractSortOption;
};

@Injectable()
export class ConsumerContractsInMemoryQuery {
  constructor(private readonly contractsQuery: ConsumerContractsQuery) {}

  async getContracts(params: ConsumerContractsInMemoryParams): Promise<{
    items: ConsumerContractItem[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const {
      consumerId,
      safePage,
      safePageSize,
      term,
      normalizedStatusFilter,
      normalizedHasDocumentsFilter,
      normalizedHasPaymentsFilter,
      normalizedSort,
    } = params;
    const contacts = await this.contractsQuery.findContactsForList(consumerId, term);

    const emails = Array.from(new Set(contacts.map((contact) => normalizeEmail(contact.email)).filter(Boolean)));
    if (emails.length === 0) {
      return { items: [], total: 0, page: safePage, pageSize: safePageSize };
    }
    const consumerEmail = await this.contractsQuery.getConsumerEmail(consumerId);

    const paymentRequests = await this.contractsQuery.findPaymentRequestsForContracts(
      consumerId,
      emails,
      consumerEmail,
    );

    const items = contacts.map((contact) => {
      const normalizedContactEmail = normalizeEmail(contact.email);
      const filteredPaymentRequests = paymentRequests.filter((paymentRequest) => {
        const payerEmail = normalizeEmail(paymentRequest.payer?.email ?? paymentRequest.payerEmail);
        const requesterEmail = normalizeEmail(paymentRequest.requester?.email ?? paymentRequest.requesterEmail);
        return payerEmail === normalizedContactEmail || requesterEmail === normalizedContactEmail;
      });
      const contractPayments = filteredPaymentRequests.map((paymentRequest) =>
        mapContractListPayment(consumerId, paymentRequest),
      );
      const latestRelationshipPayment = getLatestRelationshipPayment(contractPayments);
      const operatingPayment = getOperatingRelationshipPayment(contractPayments);

      const paymentsCount = filteredPaymentRequests.length;
      const completedPaymentsCount = contractPayments.filter((payment) => payment.status === `completed`).length;
      const docs = countUniqueAttachmentResources(filteredPaymentRequests);

      return {
        id: contact.id,
        name: contact.name ?? contact.email,
        email: contact.email,
        lastRequestId: operatingPayment?.id ?? null,
        lastStatus: operatingPayment?.status ?? null,
        lastActivity: latestRelationshipPayment?.updatedAt ?? null,
        docs,
        paymentsCount,
        completedPaymentsCount,
        contactUpdatedAt: contact.updatedAt,
      };
    });

    const filteredItems = items
      .filter((item) => matchesContractStatusFilter(item.lastStatus, normalizedStatusFilter))
      .filter((item) => matchesContractPresenceFilter(item.docs > 0, normalizedHasDocumentsFilter))
      .filter((item) => matchesContractPresenceFilter(item.paymentsCount > 0, normalizedHasPaymentsFilter))
      .sort((left, right) => {
        if (normalizedSort === `name`) {
          return left.name.localeCompare(right.name, `en`, { sensitivity: `base` });
        }

        if (normalizedSort === `payments_count`) {
          if (right.paymentsCount !== left.paymentsCount) {
            return right.paymentsCount - left.paymentsCount;
          }
        }

        const leftTimestamp = (left.lastActivity ?? left.contactUpdatedAt).getTime();
        const rightTimestamp = (right.lastActivity ?? right.contactUpdatedAt).getTime();
        if (rightTimestamp !== leftTimestamp) {
          return rightTimestamp - leftTimestamp;
        }
        return left.name.localeCompare(right.name, `en`, { sensitivity: `base` });
      });
    const total = filteredItems.length;
    const start = (safePage - 1) * safePageSize;

    return {
      items: filteredItems.slice(start, start + safePageSize).map((item) => ({
        id: item.id,
        name: item.name,
        email: item.email,
        lastRequestId: item.lastRequestId,
        lastStatus: item.lastStatus,
        lastActivity: item.lastActivity,
        docs: item.docs,
        paymentsCount: item.paymentsCount,
        completedPaymentsCount: item.completedPaymentsCount,
      })),
      total,
      page: safePage,
      pageSize: safePageSize,
    };
  }
}
