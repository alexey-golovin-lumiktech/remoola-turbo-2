import { Injectable } from '@nestjs/common';

import { ADMIN_ACTION_AUDIT_ACTIONS } from '../../shared/admin-action-audit.service';
import { PrismaTransactionRunner } from '../../shared/prisma-transaction.runner';
import { PrismaService } from '../../shared/prisma.service';

type RequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

@Injectable()
export class AdminV2ConsumerNotesRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactions: PrismaTransactionRunner,
  ) {}

  createWithAudit(consumerId: string, adminId: string, content: string, meta?: RequestMeta) {
    return this.transactions.run(async (tx) => {
      const note = await tx.consumerAdminNoteModel.create({
        data: {
          consumerId,
          adminId,
          content,
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
        },
      });

      await tx.adminActionAuditLogModel.create({
        data: {
          adminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.consumer_note_create,
          resource: `consumer`,
          resourceId: consumerId,
          metadata: { noteId: note.id },
          ipAddress: meta?.ipAddress ?? null,
          userAgent: meta?.userAgent ?? null,
        },
      });

      return note;
    });
  }
}
