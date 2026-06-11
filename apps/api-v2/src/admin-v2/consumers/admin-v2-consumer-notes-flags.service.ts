import { Injectable } from '@nestjs/common';

import {
  assertValidVersion,
  normalizeOptionalReason,
  validateNoteContent,
  validateRequiredFlag,
} from './admin-v2-consumer-action-policy';
import { AdminV2ConsumerFlagsRepository } from './admin-v2-consumer-flags.repository';
import { AdminV2ConsumerNotesRepository } from './admin-v2-consumer-notes.repository';
import { type AdminV2RequestMeta as RequestMeta } from '../admin-v2-context.types';

@Injectable()
export class AdminV2ConsumerNotesFlagsService {
  constructor(
    private readonly consumerNotesRepository: AdminV2ConsumerNotesRepository,
    private readonly consumerFlagsRepository: AdminV2ConsumerFlagsRepository,
  ) {}

  createNote(consumerId: string, adminId: string, content: string, meta?: RequestMeta) {
    const normalizedContent = validateNoteContent(content);
    return this.consumerNotesRepository.createWithAudit(consumerId, adminId, normalizedContent, meta);
  }

  async addFlag(consumerId: string, adminId: string, flag: string, reason?: string | null, meta?: RequestMeta) {
    const normalizedFlag = validateRequiredFlag(flag);
    const normalizedReason = normalizeOptionalReason(reason);
    const existing = await this.consumerFlagsRepository.findActiveByConsumerAndFlag(consumerId, normalizedFlag);
    if (existing) {
      return { ...existing, alreadyExisted: true };
    }

    return this.consumerFlagsRepository.createWithAudit(consumerId, adminId, normalizedFlag, normalizedReason, meta);
  }

  removeFlag(consumerId: string, flagId: string, adminId: string, version: number, meta?: RequestMeta) {
    assertValidVersion(version);
    return this.consumerFlagsRepository.removeWithAudit(consumerId, flagId, adminId, version, meta);
  }
}
