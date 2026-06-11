import { Injectable } from '@nestjs/common';

import { AdminV2ConsumerAdminActionsService } from './admin-v2-consumer-admin-actions.service';
import { AdminV2ConsumerNotesFlagsService } from './admin-v2-consumer-notes-flags.service';
import { AdminV2ConsumerReadService } from './admin-v2-consumer-read.service';

@Injectable()
export class AdminV2ConsumersService {
  constructor(
    private readonly consumerReadService: AdminV2ConsumerReadService,
    private readonly consumerNotesFlagsService: AdminV2ConsumerNotesFlagsService,
    private readonly consumerAdminActionsService: AdminV2ConsumerAdminActionsService,
  ) {}

  async listConsumers(...args: Parameters<AdminV2ConsumerReadService[`listConsumers`]>) {
    return this.consumerReadService.listConsumers(...args);
  }

  async getConsumerContracts(...args: Parameters<AdminV2ConsumerReadService[`getConsumerContracts`]>) {
    return this.consumerReadService.getConsumerContracts(...args);
  }

  async getConsumerLedgerSummary(...args: Parameters<AdminV2ConsumerReadService[`getConsumerLedgerSummary`]>) {
    return this.consumerReadService.getConsumerLedgerSummary(...args);
  }

  async getConsumerAuthHistory(...args: Parameters<AdminV2ConsumerReadService[`getConsumerAuthHistory`]>) {
    return this.consumerReadService.getConsumerAuthHistory(...args);
  }

  async getConsumerActionLog(...args: Parameters<AdminV2ConsumerReadService[`getConsumerActionLog`]>) {
    return this.consumerReadService.getConsumerActionLog(...args);
  }

  async getConsumerCase(...args: Parameters<AdminV2ConsumerReadService[`getConsumerCase`]>) {
    return this.consumerReadService.getConsumerCase(...args);
  }

  async createNote(...args: Parameters<AdminV2ConsumerNotesFlagsService[`createNote`]>) {
    return this.consumerNotesFlagsService.createNote(...args);
  }

  async addFlag(...args: Parameters<AdminV2ConsumerNotesFlagsService[`addFlag`]>) {
    return this.consumerNotesFlagsService.addFlag(...args);
  }

  async removeFlag(...args: Parameters<AdminV2ConsumerNotesFlagsService[`removeFlag`]>) {
    return this.consumerNotesFlagsService.removeFlag(...args);
  }

  async forceLogout(...args: Parameters<AdminV2ConsumerAdminActionsService[`forceLogout`]>) {
    return this.consumerAdminActionsService.forceLogout(...args);
  }

  async suspendConsumer(...args: Parameters<AdminV2ConsumerAdminActionsService[`suspendConsumer`]>) {
    return this.consumerAdminActionsService.suspendConsumer(...args);
  }

  async resendConsumerEmail(...args: Parameters<AdminV2ConsumerAdminActionsService[`resendConsumerEmail`]>) {
    return this.consumerAdminActionsService.resendConsumerEmail(...args);
  }
}
