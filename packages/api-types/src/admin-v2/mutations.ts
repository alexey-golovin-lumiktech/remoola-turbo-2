import { z } from 'zod';

import {
  adminV2ConfirmedMutationBodySchema,
  adminV2ConfirmedVersionedMutationBodySchema,
  adminV2ExpectedDeletedAtNullBodySchema,
  type AdminV2StepUpConfirmedVersionedMutationBody,
  type AdminV2StepUpVersionedMutationBody,
  adminV2StepUpConfirmedVersionedMutationBodySchema,
  adminV2StepUpVersionedMutationBodySchema,
  adminV2VersionedMutationBodySchema,
} from './common';
import { CONSUMER_APP_SCOPES, type ConsumerAppScope } from '../http';

const ADMIN_V2_PASSWORD_RE = /(?!.* )(?=(.*[A-Z]){2,})(?=.*?[a-z])(?=.*[1-9]{1,})(?=.*?[#?!@$%^&*-]).{8,}$/;

const adminV2PasswordSchema = z.string().regex(ADMIN_V2_PASSWORD_RE, {
  message: `Use at least 8 characters, 2 uppercase letters, 1 lowercase letter, 1 number, and 1 special character, with no spaces.`,
});

const adminV2UuidSchema = z.uuid();

export const adminV2AuthOkResponseSchema = z
  .object({
    ok: z.literal(true),
  })
  .strict();

export const PAYMENT_REVERSAL_KIND = {
  REFUND: `REFUND`,
  CHARGEBACK: `CHARGEBACK`,
} as const;
export type TPaymentReversalKind = (typeof PAYMENT_REVERSAL_KIND)[keyof typeof PAYMENT_REVERSAL_KIND];

export type AdminV2LoginBody = {
  email: string;
  password: string;
};

export type AdminV2RequestPasswordResetBody = {
  email: string;
};

export type AdminV2TokenPasswordBody = {
  token: string;
  password: string;
};

export type AdminV2RevokeAdminSessionBody = {
  sessionId?: string;
};

export type AdminV2CreateConsumerNoteBody = {
  content: string;
};

export type AdminV2AddConsumerFlagBody = {
  flag: string;
  reason?: string | null;
};

export type AdminV2RemoveConsumerFlagBody = {
  version: number;
};

export type AdminV2ForceLogoutConsumerBody = {
  confirmed: boolean;
};

export type AdminV2SuspendConsumerBody = {
  confirmed: boolean;
  reason?: string;
};

export type AdminV2ResendConsumerEmailBody = {
  emailKind: `signup_verification` | `password_recovery`;
  appScope: ConsumerAppScope;
};

export type AdminV2VerificationDecisionBody = {
  confirmed: boolean;
  reason?: string;
  version: number;
};

export type AdminV2PaymentReversalBody = {
  amount?: number;
  reason?: string;
  passwordConfirmation: string;
};

export type AdminV2DisablePaymentMethodBody = {
  confirmed: boolean;
  reason: string;
  version: number;
};

export type AdminV2RemoveDefaultPaymentMethodBody = {
  version: number;
};

export type AdminV2DuplicateEscalatePaymentMethodBody = {
  version: number;
};

export type AdminV2EscalatePayoutBody = {
  confirmed: boolean;
  version: number;
  reason?: string;
};

export type AdminV2ApproveRateBody = AdminV2StepUpConfirmedVersionedMutationBody & {
  reason: string;
};

export type AdminV2DocumentTagCreateBody = {
  name: string;
};

export type AdminV2DocumentTagUpdateBody = {
  name: string;
  version: number;
};

export type AdminV2DocumentTagDeleteBody = {
  confirmed: boolean;
  version: number;
};

export type AdminV2DocumentRetagBody = {
  version: number;
  tagIds: string[];
};

export type AdminV2DocumentBulkTagResource = {
  resourceId: string;
  version: number;
};

export type AdminV2DocumentBulkTagBody = {
  tagIds: string[];
  resources: AdminV2DocumentBulkTagResource[];
};

export type AdminV2InviteAdminBody = {
  email: string;
  roleKey: string;
  passwordConfirmation: string;
};

export type AdminV2DeactivateAdminBody = AdminV2StepUpVersionedMutationBody & {
  confirmed: boolean;
  reason?: string;
};

export type AdminV2ChangeAdminRoleBody = AdminV2StepUpVersionedMutationBody & {
  confirmed: boolean;
  roleKey: string;
};

export type AdminV2PermissionOverride = {
  capability: string;
  mode: `inherit` | `grant` | `deny`;
};

export type AdminV2ChangeAdminPermissionsBody = AdminV2StepUpVersionedMutationBody & {
  capabilityOverrides: AdminV2PermissionOverride[];
};

export type AdminV2AdminPasswordPatchBody = {
  password: string;
  passwordConfirmation: string;
};

export type AdminV2LegacyAdminStatusBody = {
  action: `delete` | `restore`;
  passwordConfirmation?: string;
};

export type AdminV2AuthOkResponse = z.infer<typeof adminV2AuthOkResponseSchema>;
export type AdminV2AcceptAdminInvitationResponse = {
  adminId: string;
  email: string;
  accepted: true;
};
export type AdminV2RequestPasswordResetResponse = {
  message: string;
  recoveryMode: `generic`;
};
export type AdminV2ResetPasswordWithTokenResponse = {
  success: true;
  adminId: string;
};
export type AdminV2RevokeAdminSessionResponse = AdminV2AuthOkResponse & {
  revokedSessionId: string;
  alreadyRevoked: boolean;
};

export const adminV2LoginBodySchema = z
  .object({
    email: z.email().trim(),
    password: z.string().min(1),
  })
  .strict();

export const adminV2RequestPasswordResetBodySchema = z
  .object({
    email: z.email().trim(),
  })
  .strict();

export const adminV2TokenPasswordBodySchema = z
  .object({
    token: z.string().trim().min(1),
    password: adminV2PasswordSchema,
  })
  .strict();

export const adminV2RevokeAdminSessionBodySchema = z
  .object({
    sessionId: adminV2UuidSchema.optional(),
  })
  .strict();

export const adminV2AcceptAdminInvitationResponseSchema = z
  .object({
    adminId: z.string(),
    email: z.email(),
    accepted: z.literal(true),
  })
  .strict();

export const adminV2RequestPasswordResetResponseSchema = z
  .object({
    message: z.string().min(1),
    recoveryMode: z.literal(`generic`),
  })
  .strict();

export const adminV2ResetPasswordWithTokenResponseSchema = z
  .object({
    success: z.literal(true),
    adminId: z.string(),
  })
  .strict();

export const adminV2RevokeAdminSessionResponseSchema = adminV2AuthOkResponseSchema.extend({
  revokedSessionId: z.string(),
  alreadyRevoked: z.boolean(),
});

export const adminV2CreateConsumerNoteBodySchema = z
  .object({
    content: z.string().trim().min(1).max(4000),
  })
  .strict();

export const adminV2AddConsumerFlagBodySchema = z
  .object({
    flag: z.string().trim().min(1).max(64),
    reason: z.string().trim().max(500).nullable().optional(),
  })
  .strict();

export const adminV2RemoveConsumerFlagBodySchema = adminV2VersionedMutationBodySchema;

export const adminV2ForceLogoutConsumerBodySchema = adminV2ConfirmedMutationBodySchema;

export const adminV2SuspendConsumerBodySchema = adminV2ConfirmedMutationBodySchema
  .extend({
    reason: z.string().trim().min(1).max(500),
  })
  .strict();

export const adminV2ResendConsumerEmailBodySchema = z
  .object({
    emailKind: z.enum([`signup_verification`, `password_recovery`]),
    appScope: z.enum(CONSUMER_APP_SCOPES),
  })
  .strict();

export const adminV2VerificationDecisionBodySchema = adminV2ConfirmedVersionedMutationBodySchema
  .extend({
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

export const adminV2PaymentReversalBodySchema = z
  .object({
    amount: z.number().positive().optional(),
    reason: z.string().trim().max(500).optional(),
    passwordConfirmation: z.string().min(1).max(256),
  })
  .strict();

export const adminV2DisablePaymentMethodBodySchema = adminV2ConfirmedVersionedMutationBodySchema
  .extend({
    reason: z.string().trim().min(1).max(500),
  })
  .strict();

export const adminV2RemoveDefaultPaymentMethodBodySchema = adminV2VersionedMutationBodySchema;

export const adminV2DuplicateEscalatePaymentMethodBodySchema = adminV2VersionedMutationBodySchema;

export const adminV2EscalatePayoutBodySchema = adminV2ConfirmedVersionedMutationBodySchema
  .extend({
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

export const adminV2ApproveRateBodySchema = adminV2StepUpConfirmedVersionedMutationBodySchema
  .extend({
    reason: z.string().trim().min(1).max(500),
  })
  .strict();

export const adminV2InviteAdminBodySchema = z
  .object({
    email: z.email(),
    roleKey: z.string().min(1),
    passwordConfirmation: z.string().min(1).max(256),
  })
  .strict();

export const adminV2DeactivateAdminBodySchema = adminV2StepUpVersionedMutationBodySchema
  .extend({
    confirmed: z.boolean(),
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

export const adminV2ChangeAdminRoleBodySchema = adminV2StepUpVersionedMutationBodySchema
  .extend({
    confirmed: z.boolean(),
    roleKey: z.string().min(1),
  })
  .strict();

export const adminV2ChangeAdminPermissionsBodySchema = adminV2StepUpVersionedMutationBodySchema
  .extend({
    capabilityOverrides: z.array(
      z
        .object({
          capability: z.string().min(1),
          mode: z.enum([`inherit`, `grant`, `deny`]),
        })
        .strict(),
    ),
  })
  .strict();

export const adminV2AdminPasswordPatchBodySchema = z
  .object({
    password: z.string().min(1),
    passwordConfirmation: z.string().min(1).max(256),
  })
  .strict();

export const adminV2LegacyAdminStatusBodySchema = z
  .object({
    action: z.enum([`delete`, `restore`]),
    passwordConfirmation: z.string().max(256).optional(),
  })
  .strict();

export const adminV2DocumentTagCreateBodySchema = z
  .object({
    name: z.string().trim().min(1),
  })
  .strict();

export const adminV2DocumentTagUpdateBodySchema = adminV2VersionedMutationBodySchema
  .extend({
    name: z.string().trim().min(1),
  })
  .strict();

export const adminV2DocumentTagDeleteBodySchema = adminV2ConfirmedVersionedMutationBodySchema;

export const adminV2DocumentRetagBodySchema = adminV2VersionedMutationBodySchema
  .extend({
    tagIds: z.array(z.string().trim().min(1)),
  })
  .strict();

export const adminV2DocumentBulkTagResourceSchema = adminV2VersionedMutationBodySchema
  .extend({
    resourceId: z.string().trim().min(1),
  })
  .strict();

export const adminV2DocumentBulkTagBodySchema = z
  .object({
    tagIds: z.array(z.string().trim().min(1)),
    resources: z.array(adminV2DocumentBulkTagResourceSchema),
  })
  .strict();

export const adminV2RunExchangeRuleBodySchema = adminV2StepUpVersionedMutationBodySchema;
export const adminV2PauseExchangeRuleBodySchema = adminV2VersionedMutationBodySchema;
export const adminV2ResumeExchangeRuleBodySchema = adminV2VersionedMutationBodySchema;
export const adminV2RestoreAdminBodySchema = adminV2StepUpVersionedMutationBodySchema;
export const adminV2ResetAdminPasswordBodySchema = adminV2StepUpVersionedMutationBodySchema;
