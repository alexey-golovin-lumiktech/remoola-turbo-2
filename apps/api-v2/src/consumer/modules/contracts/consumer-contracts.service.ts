import { Injectable, NotFoundException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerContractsQuery } from './consumer-contracts.query';
import { ConsumerContractDetails, ConsumerContractItem } from './dto';
import { normalizeConsumerFacingTransactionStatus } from '../../consumer-status-compat';
import { buildConsumerDocumentDownloadUrl } from '../documents/document-download-url';

@Injectable()
export class ConsumerContractsService {
  constructor(private readonly contractsQuery: ConsumerContractsQuery) {}

  private static readonly STATUS_FILTERS = new Set([`draft`, `completed`, `waiting`, `pending`, `no_activity`]);
  private static readonly PRESENCE_FILTERS = new Set([`yes`, `no`]);
  private static readonly SORT_OPTIONS = new Set([`recent_activity`, `name`, `payments_count`]);
  private static readonly OPERATING_STATUS_PRIORITY = [`draft`, `pending`, `waiting`] as const;

  private normalizeEmail(value: string | null | undefined): string {
    return value?.trim().toLowerCase() ?? ``;
  }

  private getEffectiveLedgerStatus(
    entry:
      | {
          status: $Enums.TransactionStatus;
          outcomes?: Array<{ status: $Enums.TransactionStatus }>;
        }
      | null
      | undefined,
  ): $Enums.TransactionStatus | null {
    if (!entry) return null;
    return entry.outcomes?.[0]?.status ?? entry.status;
  }

  private getEffectivePaymentRequestStatus(
    paymentRequestStatus: $Enums.TransactionStatus,
    entry:
      | {
          status: $Enums.TransactionStatus;
          outcomes?: Array<{ status: $Enums.TransactionStatus }>;
        }
      | null
      | undefined,
  ): $Enums.TransactionStatus {
    return this.getEffectiveLedgerStatus(entry) ?? paymentRequestStatus;
  }

  private normalizeStatusFilter(value: string | null | undefined): string | null {
    const normalized = value?.trim().toLowerCase() ?? ``;
    return ConsumerContractsService.STATUS_FILTERS.has(normalized) ? normalized : null;
  }

  private normalizePresenceFilter(value: string | null | undefined): `yes` | `no` | null {
    const normalized = value?.trim().toLowerCase() ?? ``;
    return ConsumerContractsService.PRESENCE_FILTERS.has(normalized) ? (normalized as `yes` | `no`) : null;
  }

  private normalizeSort(value: string | null | undefined): `recent_activity` | `name` | `payments_count` {
    const normalized = value?.trim().toLowerCase() ?? ``;
    return ConsumerContractsService.SORT_OPTIONS.has(normalized)
      ? (normalized as `recent_activity` | `name` | `payments_count`)
      : `recent_activity`;
  }

  private matchesStatusFilter(lastStatus: string | null, filter: string | null): boolean {
    if (!filter) return true;
    if (filter === `no_activity`) return lastStatus == null;
    return lastStatus === filter;
  }

  private matchesPresenceFilter(hasValue: boolean, filter: `yes` | `no` | null): boolean {
    if (!filter) return true;
    return filter === `yes` ? hasValue : !hasValue;
  }

  private sortContractPaymentsByUpdatedAt<
    T extends {
      updatedAt: Date;
    },
  >(payments: T[]): T[] {
    return [...payments].sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
  }

  private getLatestRelationshipPayment<
    T extends {
      updatedAt: Date;
    },
  >(payments: T[]): T | null {
    return this.sortContractPaymentsByUpdatedAt(payments)[0] ?? null;
  }

  private getOperatingRelationshipPayment<
    T extends {
      status: string;
      updatedAt: Date;
    },
  >(payments: T[]): T | null {
    const orderedPayments = this.sortContractPaymentsByUpdatedAt(payments);
    for (const status of ConsumerContractsService.OPERATING_STATUS_PRIORITY) {
      const matchingPayment = orderedPayments.find((payment) => payment.status === status);
      if (matchingPayment) {
        return matchingPayment;
      }
    }
    return orderedPayments[0] ?? null;
  }

  private async getContractsInMemory(
    consumerId: string,
    safePage: number,
    safePageSize: number,
    term: string,
    normalizedStatusFilter: string | null,
    normalizedHasDocumentsFilter: `yes` | `no` | null,
    normalizedHasPaymentsFilter: `yes` | `no` | null,
    normalizedSort: `recent_activity` | `name` | `payments_count`,
  ): Promise<{ items: ConsumerContractItem[]; total: number; page: number; pageSize: number }> {
    const contacts = await this.contractsQuery.findContactsForList(consumerId, term);

    const emails = Array.from(new Set(contacts.map((contact) => this.normalizeEmail(contact.email)).filter(Boolean)));
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
      const normalizedContactEmail = this.normalizeEmail(contact.email);
      const filteredPaymentRequests = paymentRequests.filter((paymentRequest) => {
        const payerEmail = this.normalizeEmail(paymentRequest.payer?.email ?? paymentRequest.payerEmail);
        const requesterEmail = this.normalizeEmail(paymentRequest.requester?.email ?? paymentRequest.requesterEmail);
        return payerEmail === normalizedContactEmail || requesterEmail === normalizedContactEmail;
      });
      const contractPayments = filteredPaymentRequests.map((paymentRequest) =>
        this.mapContractListPayment(consumerId, paymentRequest),
      );
      const latestRelationshipPayment = this.getLatestRelationshipPayment(contractPayments);
      const operatingPayment = this.getOperatingRelationshipPayment(contractPayments);

      const paymentsCount = filteredPaymentRequests.length;
      const completedPaymentsCount = filteredPaymentRequests.filter((paymentRequest) => {
        const latestConsumerLedgerEntry = paymentRequest.ledgerEntries[0];
        return (
          normalizeConsumerFacingTransactionStatus(
            this.getEffectivePaymentRequestStatus(paymentRequest.status, latestConsumerLedgerEntry),
          ).toLowerCase() === `completed`
        );
      }).length;
      const docs = this.countUniqueAttachmentResources(filteredPaymentRequests);

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
      .filter((item) => this.matchesStatusFilter(item.lastStatus, normalizedStatusFilter))
      .filter((item) => this.matchesPresenceFilter(item.docs > 0, normalizedHasDocumentsFilter))
      .filter((item) => this.matchesPresenceFilter(item.paymentsCount > 0, normalizedHasPaymentsFilter))
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

  private mapContractPayment(
    consumerId: string,
    contractEmail: string,
    paymentRequest: {
      id: string;
      amount: { toString(): string };
      status: $Enums.TransactionStatus;
      createdAt: Date;
      updatedAt: Date;
      paymentRail: $Enums.PaymentRail | null;
      payer?: { email?: string | null } | null;
      payerEmail?: string | null;
      requester?: { email?: string | null } | null;
      requesterEmail?: string | null;
      ledgerEntries: Array<{
        consumerId?: string;
        status: $Enums.TransactionStatus;
        outcomes?: Array<{ status: $Enums.TransactionStatus }>;
      }>;
    },
  ) {
    const latestConsumerLedgerEntry = paymentRequest.ledgerEntries.find(
      (entry) => !entry.consumerId || entry.consumerId === consumerId,
    );
    const status = normalizeConsumerFacingTransactionStatus(
      this.getEffectivePaymentRequestStatus(paymentRequest.status, latestConsumerLedgerEntry),
    ).toLowerCase();
    const normalizedContractEmail = this.normalizeEmail(contractEmail);
    const payerEmail = this.normalizeEmail(paymentRequest.payer?.email ?? paymentRequest.payerEmail);
    const requesterEmail = this.normalizeEmail(paymentRequest.requester?.email ?? paymentRequest.requesterEmail);
    const role =
      payerEmail === normalizedContractEmail
        ? `REQUESTER`
        : requesterEmail === normalizedContractEmail
          ? `PAYER`
          : `REQUESTER`;

    return {
      id: paymentRequest.id,
      amount: paymentRequest.amount.toString(),
      status,
      createdAt: paymentRequest.createdAt,
      updatedAt: paymentRequest.updatedAt,
      role,
      paymentRail: paymentRequest.paymentRail,
    };
  }

  private mapContractListPayment(
    consumerId: string,
    paymentRequest: {
      id: string;
      status: $Enums.TransactionStatus;
      updatedAt: Date;
      ledgerEntries: Array<{
        consumerId?: string;
        status: $Enums.TransactionStatus;
        outcomes?: Array<{ status: $Enums.TransactionStatus }>;
      }>;
    },
  ) {
    const latestConsumerLedgerEntry = paymentRequest.ledgerEntries.find(
      (entry) => !entry.consumerId || entry.consumerId === consumerId,
    );

    return {
      id: paymentRequest.id,
      status: normalizeConsumerFacingTransactionStatus(
        this.getEffectivePaymentRequestStatus(paymentRequest.status, latestConsumerLedgerEntry),
      ).toLowerCase(),
      updatedAt: paymentRequest.updatedAt,
    };
  }

  private countUniqueAttachmentResources(
    paymentRequests: Array<{
      attachments: Array<{
        resourceId?: string | null;
        id?: string | null;
      }>;
    }>,
  ) {
    const resourceIds = new Set<string>();
    for (const paymentRequest of paymentRequests) {
      for (const attachment of paymentRequest.attachments) {
        const resourceId = attachment.resourceId?.trim() || attachment.id?.trim();
        if (resourceId) {
          resourceIds.add(resourceId);
        }
      }
    }
    return resourceIds.size;
  }

  private buildContractDocuments(
    paymentRequests: Array<{
      status: $Enums.TransactionStatus;
      id: string;
      attachments: Array<{
        resource: {
          id: string;
          originalName: string;
          createdAt: Date | null;
          resourceTags: Array<{ tag: { name: string } }>;
        };
      }>;
    }>,
    backendBaseUrl?: string,
  ) {
    const byResource = new Map<
      string,
      {
        id: string;
        name: string;
        downloadUrl: string;
        createdAt: Date;
        tags: string[];
        attachedDraftPaymentRequestIds: string[];
        attachedNonDraftPaymentRequestIds: string[];
      }
    >();

    for (const paymentRequest of paymentRequests) {
      for (const attachment of paymentRequest.attachments) {
        const resource = attachment.resource;
        const current = byResource.get(resource.id);
        const nextDraftIds = new Set(current?.attachedDraftPaymentRequestIds ?? []);
        const nextNonDraftIds = new Set(current?.attachedNonDraftPaymentRequestIds ?? []);

        if (paymentRequest.status === $Enums.TransactionStatus.DRAFT) {
          nextDraftIds.add(paymentRequest.id);
        } else {
          nextNonDraftIds.add(paymentRequest.id);
        }

        byResource.set(resource.id, {
          id: resource.id,
          name: resource.originalName,
          downloadUrl: buildConsumerDocumentDownloadUrl(resource.id, backendBaseUrl),
          createdAt: resource.createdAt ?? current?.createdAt ?? new Date(0),
          tags: Array.from(new Set([...(current?.tags ?? []), ...resource.resourceTags.map((tag) => tag.tag.name)])),
          attachedDraftPaymentRequestIds: Array.from(nextDraftIds),
          attachedNonDraftPaymentRequestIds: Array.from(nextNonDraftIds),
        });
      }
    }

    return Array.from(byResource.values())
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map((document) => ({
        ...document,
        isAttachedToDraftPaymentRequest: document.attachedDraftPaymentRequestIds.length > 0,
        isAttachedToNonDraftPaymentRequest: document.attachedNonDraftPaymentRequestIds.length > 0,
      }));
  }

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
    const normalizedStatusFilter = this.normalizeStatusFilter(status);
    const normalizedHasDocumentsFilter = this.normalizePresenceFilter(hasDocuments);
    const normalizedHasPaymentsFilter = this.normalizePresenceFilter(hasPayments);
    const normalizedSort = this.normalizeSort(sort);
    if (this.contractsQuery.supportsRawContractsQuery()) {
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

    return this.getContractsInMemory(
      consumerId,
      safePage,
      safePageSize,
      term,
      normalizedStatusFilter,
      normalizedHasDocumentsFilter,
      normalizedHasPaymentsFilter,
      normalizedSort,
    );
  }

  async getDetails(id: string, consumerId: string, backendBaseUrl?: string): Promise<ConsumerContractDetails> {
    const contact = await this.contractsQuery.findContactForDetails(id, consumerId);

    if (!contact) {
      throw new NotFoundException(errorCodes.CONTACT_NOT_FOUND);
    }

    const consumerEmail = await this.contractsQuery.getConsumerEmail(consumerId);

    const paymentRequests = await this.contractsQuery.findPaymentRequestsForDetails(
      consumerId,
      this.normalizeEmail(contact.email),
      consumerEmail,
    );

    const payments = paymentRequests.map((paymentRequest) =>
      this.mapContractPayment(consumerId, contact.email, paymentRequest),
    );
    const documents = this.buildContractDocuments(paymentRequests, backendBaseUrl);
    const latestPayment = this.getLatestRelationshipPayment(payments);
    const operatingPayment = this.getOperatingRelationshipPayment(payments);

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
