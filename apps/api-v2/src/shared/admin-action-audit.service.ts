import { Injectable, Logger } from '@nestjs/common';

import { ADMIN_ACTION_AUDIT_ACTIONS, AdminActionAuditPolicyService } from './admin-action-audit-policy.service';
import {
  type AdminActionAuditWriteClient,
  type AdminActionAuditWriteParams,
  AdminActionAuditRepository,
} from './admin-action-audit.repository';

export { ADMIN_ACTION_AUDIT_ACTIONS };

@Injectable()
export class AdminActionAuditService {
  private readonly logger = new Logger(AdminActionAuditService.name);

  constructor(
    private readonly repository: AdminActionAuditRepository,
    private readonly policy: AdminActionAuditPolicyService,
  ) {}

  get actions() {
    return this.policy.getActions();
  }

  /**
   * Record a sensitive admin action. Append-only; never throws on failure so it does not break the main flow.
   */
  async record(params: AdminActionAuditWriteParams): Promise<void> {
    try {
      await this.recordRequired(params);
    } catch (err) {
      this.logger.warn({
        event: `admin_action_audit_write_failed`,
        action: params.action,
        resource: params.resource,
        message: err instanceof Error ? err.message : `Unknown`,
      });
    }
  }

  /**
   * Record a security/money-critical admin action. Callers use this when the main flow must not silently succeed
   * without durable audit evidence.
   */
  async recordRequired(params: AdminActionAuditWriteParams): Promise<void> {
    await this.repository.createAuditEntry(params);
  }

  async recordRequiredWithClient(
    client: AdminActionAuditWriteClient,
    params: AdminActionAuditWriteParams,
  ): Promise<void> {
    await this.repository.createAuditEntry(params, client);
  }
}
