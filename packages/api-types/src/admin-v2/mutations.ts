import { z } from 'zod';

import {
  adminV2ConfirmedMutationBodySchema,
  adminV2ConfirmedVersionedMutationBodySchema,
  type AdminV2StepUpConfirmedVersionedMutationBody,
  type AdminV2StepUpVersionedMutationBody,
  adminV2StepUpConfirmedVersionedMutationBodySchema,
  adminV2StepUpVersionedMutationBodySchema,
  adminV2VersionedMutationBodySchema,
} from './common';
import { CONSUMER_APP_SCOPES, type ConsumerAppScope } from '../http';

export const PAYMENT_REVERSAL_KIND = {
  REFUND: `REFUND`,
  CHARGEBACK: `CHARGEBACK`,
} as const;
export type TPaymentReversalKind = (typeof PAYMENT_REVERSAL_KIND)[keyof typeof PAYMENT_REVERSAL_KIND];

const PAYMENT_REVERSAL_KINDS = [PAYMENT_REVERSAL_KIND.REFUND, PAYMENT_REVERSAL_KIND.CHARGEBACK] as const;

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

const adminV2LoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const adminV2RequestPasswordResetBodySchema = z.object({
  email: z.string().email(),
});

const adminV2TokenPasswordBodySchema = z.object({
  token: z.string().min(1),
  password: z.string().min(1),
});

const adminV2RevokeAdminSessionBodySchema = z.object({
  sessionId: z.string().uuid().optional(),
});

const adminV2CreateConsumerNoteBodySchema = z.object({
  content: z.string().trim().min(1).max(4000),
});

const adminV2AddConsumerFlagBodySchema = z.object({
  flag: z.string().trim().min(1).max(64),
  reason: z.string().trim().max(500).optional().nullable(),
});

const adminV2RemoveConsumerFlagBodySchema = adminV2VersionedMutationBodySchema;

export const adminV2ForceLogoutConsumerBodySchema = adminV2ConfirmedMutationBodySchema;

export const adminV2SuspendConsumerBodySchema = adminV2ConfirmedMutationBodySchema.extend({
  reason: z.string().trim().min(1).max(500),
});

export const adminV2ResendConsumerEmailBodySchema = z.object({
  emailKind: z.enum([`signup_verification`, `password_recovery`]),
  appScope: z.enum(CONSUMER_APP_SCOPES),
});

export const adminV2VerificationDecisionBodySchema = adminV2ConfirmedVersionedMutationBodySchema.extend({
  reason: z.string().trim().max(500).optional(),
});

export const adminV2PaymentReversalBodySchema = z
  .object({
    amount: z.number().positive().optional(),
    reason: z.string().trim().max(500).optional(),
    passwordConfirmation: z.string().min(1).max(256),
  })
  .strict();

const adminV2PaymentReversalKindSchema = z.enum(PAYMENT_REVERSAL_KINDS);

export const adminV2DisablePaymentMethodBodySchema = adminV2ConfirmedVersionedMutationBodySchema.extend({
  reason: z.string().trim().min(1).max(500),
});

export const adminV2RemoveDefaultPaymentMethodBodySchema = adminV2VersionedMutationBodySchema;
const adminV2DuplicateEscalatePaymentMethodBodySchema = adminV2VersionedMutationBodySchema;

export const adminV2EscalatePayoutBodySchema = adminV2ConfirmedVersionedMutationBodySchema.extend({
  reason: z.string().trim().max(500).optional(),
});

export const adminV2ApproveRateBodySchema = adminV2StepUpConfirmedVersionedMutationBodySchema.extend({
  reason: z.string().trim().min(1).max(500),
});

const adminV2DocumentTagCreateBodySchema = z.object({
  name: z.string().trim().min(1).max(64),
});

const adminV2DocumentTagUpdateBodySchema = adminV2VersionedMutationBodySchema.extend({
  name: z.string().trim().min(1).max(64),
});

const adminV2DocumentTagDeleteBodySchema = adminV2ConfirmedVersionedMutationBodySchema;

const adminV2DocumentRetagBodySchema = adminV2VersionedMutationBodySchema.extend({
  tagIds: z.array(z.string().uuid()),
});

const adminV2DocumentBulkTagBodySchema = z.object({
  tagIds: z.array(z.string().uuid()),
  resources: z.array(
    z.object({
      resourceId: z.string().uuid(),
      version: z.number().int().positive(),
    }),
  ),
});

export const adminV2InviteAdminBodySchema = z.object({
  email: z.string().email(),
  roleKey: z.string().min(1),
  passwordConfirmation: z.string().min(1).max(256),
});

export const adminV2DeactivateAdminBodySchema = adminV2StepUpVersionedMutationBodySchema.extend({
  confirmed: z.boolean(),
  reason: z.string().trim().max(500).optional(),
});

export const adminV2ChangeAdminRoleBodySchema = adminV2StepUpVersionedMutationBodySchema.extend({
  confirmed: z.boolean(),
  roleKey: z.string().min(1),
});

export const adminV2ChangeAdminPermissionsBodySchema = adminV2StepUpVersionedMutationBodySchema.extend({
  capabilityOverrides: z.array(
    z.object({
      capability: z.string().min(1),
      mode: z.enum([`inherit`, `grant`, `deny`]),
    }),
  ),
});

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
