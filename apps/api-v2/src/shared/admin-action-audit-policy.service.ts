import { Inject, Injectable } from '@nestjs/common';

/** Action names for admin action audit (fintech compliance). */
export const ADMIN_ACTION_AUDIT_ACTIONS = {
  consumer_note_create: `consumer_note_create`,
  consumer_flag_add: `consumer_flag_add`,
  consumer_flag_remove: `consumer_flag_remove`,
  payment_refund: `payment_refund`,
  payment_chargeback: `payment_chargeback`,
  admin_invite: `admin_invite`,
  admin_password_change: `admin_password_change`,
  admin_password_reset: `admin_password_reset`,
  admin_delete: `admin_delete`,
  admin_deactivate: `admin_deactivate`,
  admin_restore: `admin_restore`,
  admin_role_change: `admin_role_change`,
  admin_permissions_change: `admin_permissions_change`,
  admin_session_revoke: `admin_session_revoke`,
  admin_session_revoke_other: `admin_session_revoke_other`,
  consumer_verification_update: `consumer_verification_update`,
  consumer_force_logout: `consumer_force_logout`,
  consumer_suspend: `consumer_suspend`,
  consumer_email_resend: `consumer_email_resend`,
  verification_approve: `verification_approve`,
  verification_reject: `verification_reject`,
  verification_request_info: `verification_request_info`,
  verification_flag: `verification_flag`,
  payment_method_disable: `payment_method_disable`,
  payment_method_remove_default: `payment_method_remove_default`,
  payment_method_duplicate_escalate: `payment_method_duplicate_escalate`,
  payout_escalate: `payout_escalate`,
  exchange_rate_create: `exchange_rate_create`,
  exchange_rate_update: `exchange_rate_update`,
  exchange_rate_delete: `exchange_rate_delete`,
  exchange_rate_approve: `exchange_rate_approve`,
  exchange_rule_pause: `exchange_rule_pause`,
  exchange_rule_resume: `exchange_rule_resume`,
  exchange_rule_run_now: `exchange_rule_run_now`,
  exchange_scheduled_force_execute: `exchange_scheduled_force_execute`,
  exchange_rule_run: `exchange_rule_run`,
  exchange_scheduled_cancel: `exchange_scheduled_cancel`,
  exchange_scheduled_execute: `exchange_scheduled_execute`,
  document_tag_create: `document_tag_create`,
  document_tag_update: `document_tag_update`,
  document_tag_delete: `document_tag_delete`,
  document_retag: `document_retag`,
  document_bulk_tag: `document_bulk_tag`,
  assignment_claim: `assignment_claim`,
  assignment_release: `assignment_release`,
  assignment_reassign: `assignment_reassign`,
  saved_view_create: `saved_view_create`,
  saved_view_update: `saved_view_update`,
  saved_view_delete: `saved_view_delete`,
  alert_create: `alert_create`,
  alert_update: `alert_update`,
  alert_delete: `alert_delete`,
} as const;

type AdminActionAuditActions = typeof ADMIN_ACTION_AUDIT_ACTIONS;

export const ADMIN_ACTION_AUDIT_ACTIONS_TOKEN = Symbol(`ADMIN_ACTION_AUDIT_ACTIONS_TOKEN`);

@Injectable()
export class AdminActionAuditPolicyService {
  constructor(
    @Inject(ADMIN_ACTION_AUDIT_ACTIONS_TOKEN)
    private readonly actions: AdminActionAuditActions,
  ) {}

  getActions(): AdminActionAuditActions {
    return this.actions;
  }
}
