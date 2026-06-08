import { Injectable } from '@nestjs/common';

import { AdminV2AdminAuditTrail } from './admin-v2-admin-audit-trail';
import { AdminV2AdminMutationsRepository } from './admin-v2-admin-mutations.repository';
import { type RequestMeta, deriveStatus, deriveVersion } from './admin-v2-admins.utils';
import { ADMIN_ACTION_AUDIT_ACTIONS } from '../../shared/admin-action-audit.service';
import { hashPassword } from '../../shared-common';

@Injectable()
export class AdminV2AdminCredentialsCommandsService {
  constructor(
    private readonly repository: AdminV2AdminMutationsRepository,
    private readonly auditTrail: AdminV2AdminAuditTrail,
  ) {}

  async patchAdminPassword(targetAdminId: string, password: string, actorAdminId: string, meta: RequestMeta) {
    const { hash, salt } = await hashPassword(password);
    const updated = await this.repository.patchAdminPassword({ targetAdminId, hash, salt });

    await this.auditTrail.recordAdminActionAudit({
      adminId: actorAdminId,
      action: ADMIN_ACTION_AUDIT_ACTIONS.admin_password_change,
      resourceId: updated.id,
      metadata: {
        targetEmail: updated.email,
      },
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent ?? null,
    });

    return {
      adminId: updated.id,
      email: updated.email,
      type: updated.type,
      status: deriveStatus(updated.deletedAt),
      version: deriveVersion(updated.updatedAt),
    };
  }
}
