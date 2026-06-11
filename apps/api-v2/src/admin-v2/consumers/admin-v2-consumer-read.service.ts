import { Injectable, NotFoundException } from '@nestjs/common';

import { AdminV2ConsumerActivityQuery } from './admin-v2-consumer-activity.query';
import { AdminV2ConsumerCaseQuery } from './admin-v2-consumer-case.query';
import { AdminV2ConsumerLedgerQuery } from './admin-v2-consumer-ledger.query';
import { mapConsumerDisplayName } from './admin-v2-consumer-query-helpers';
import { type AdminV2ConsumerListParams, AdminV2ConsumerRepository } from './admin-v2-consumer.repository';
import { ConsumerContractsService } from '../../shared/consumer-contracts/consumer-contracts.service';

@Injectable()
export class AdminV2ConsumerReadService {
  constructor(
    private readonly consumerRepository: AdminV2ConsumerRepository,
    private readonly consumerActivityQuery: AdminV2ConsumerActivityQuery,
    private readonly consumerLedgerQuery: AdminV2ConsumerLedgerQuery,
    private readonly consumerContractsService: ConsumerContractsService,
    private readonly consumerCaseQuery: AdminV2ConsumerCaseQuery,
  ) {}

  private async requireConsumer(consumerId: string) {
    const consumer = await this.consumerRepository.findSummaryById(consumerId);
    if (!consumer) {
      throw new NotFoundException(`Consumer not found`);
    }
    return consumer;
  }

  async listConsumers(params?: AdminV2ConsumerListParams) {
    const pageSize = Math.min(Math.max(params?.pageSize ?? 20, 1), 100);
    const page = Math.max(params?.page ?? 1, 1);
    const skip = (page - 1) * pageSize;
    const { items, total } = await this.consumerRepository.list(params, skip, pageSize);

    return {
      items: items.map((item) => ({
        ...item,
        displayName: mapConsumerDisplayName(item),
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
    return this.consumerLedgerQuery.getLedgerSummary(consumerId);
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
    return this.consumerActivityQuery.getConsumerAuthHistory({
      consumerId,
      consumerEmail: consumer.email,
      page: params?.page,
      pageSize: params?.pageSize,
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
    });
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
    return this.consumerActivityQuery.getConsumerActionLog({
      consumerId,
      page: params?.page,
      pageSize: params?.pageSize,
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
      action: params?.action,
    });
  }

  getConsumerCase(consumerId: string) {
    return this.consumerCaseQuery.getConsumerCase(consumerId);
  }
}
