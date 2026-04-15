import type { Prisma } from '@remoola/database-2';

// This file is auto-generated from packages/database-2/prisma/schema.prisma.
// Run `yarn schema:generate:helpers` from the repo root to regenerate it.
/* eslint-disable @typescript-eslint/no-empty-object-type */

export type AccessRefreshTokenModelWithRelations = Prisma.AccessRefreshTokenModelGetPayload<{}>;

export type AuthSessionModelWithRelations = Prisma.AuthSessionModelGetPayload<{
  include: {
    consumer: true;
    replacedBySession: true;
    replacedSessions: true;
  };
}>;

export type AuthAuditLogModelWithRelations = Prisma.AuthAuditLogModelGetPayload<{}>;

export type AdminActionAuditLogModelWithRelations = Prisma.AdminActionAuditLogModelGetPayload<{
  include: {
    admin: true;
  };
}>;

export type ConsumerActionLogModelWithRelations = Prisma.ConsumerActionLogModelGetPayload<{
  include: {
    consumer: true;
  };
}>;
export type ConsumerActionLogModelKey = Pick<Prisma.ConsumerActionLogModelGetPayload<{}>, `id` | `createdAt`>;

export type AuthLoginLockoutModelWithRelations = Prisma.AuthLoginLockoutModelGetPayload<{}>;
export type AuthLoginLockoutModelKey = Pick<Prisma.AuthLoginLockoutModelGetPayload<{}>, `identityType` | `email`>;

export type OauthStateModelWithRelations = Prisma.OauthStateModelGetPayload<{}>;

export type StripeWebhookEventModelWithRelations = Prisma.StripeWebhookEventModelGetPayload<{}>;

export type AddressDetailsModelWithRelations = Prisma.AddressDetailsModelGetPayload<{
  include: {
    consumer: true;
  };
}>;

export type AdminModelWithRelations = Prisma.AdminModelGetPayload<{
  include: {
    adminSettings: true;
    adminActionAuditLogs: true;
    consumerNotes: true;
    consumerFlags: true;
    removedConsumerFlags: true;
  };
}>;

export type BillingDetailsModelWithRelations = Prisma.BillingDetailsModelGetPayload<{
  include: {
    paymentMethods: true;
  };
}>;

export type ConsumerModelWithRelations = Prisma.ConsumerModelGetPayload<{
  include: {
    addressDetails: true;
    personalDetails: true;
    organizationDetails: true;
    googleProfileDetails: true;
    consumerSettings: true;
    asPayerPaymentRequests: true;
    asRequesterPaymentRequests: true;
    consumerResources: true;
    contacts: true;
    paymentMethods: true;
    attachments: true;
    passwordResets: true;
    authSessions: true;
    adminNotes: true;
    adminFlags: true;
    ledgerEntries: true;
    autoConversionRules: true;
    scheduledFxConversions: true;
    consumerActionLogs: true;
  };
}>;

export type ConsumerAdminNoteModelWithRelations = Prisma.ConsumerAdminNoteModelGetPayload<{
  include: {
    consumer: true;
    admin: true;
  };
}>;

export type ConsumerFlagModelWithRelations = Prisma.ConsumerFlagModelGetPayload<{
  include: {
    consumer: true;
    admin: true;
    removedByAdmin: true;
  };
}>;

export type ConsumerResourceModelWithRelations = Prisma.ConsumerResourceModelGetPayload<{
  include: {
    consumer: true;
    resource: true;
  };
}>;

export type ContactModelWithRelations = Prisma.ContactModelGetPayload<{
  include: {
    consumer: true;
  };
}>;

export type ExchangeRateModelWithRelations = Prisma.ExchangeRateModelGetPayload<{}>;

export type WalletAutoConversionRuleModelWithRelations = Prisma.WalletAutoConversionRuleModelGetPayload<{
  include: {
    consumer: true;
  };
}>;

export type ScheduledFxConversionModelWithRelations = Prisma.ScheduledFxConversionModelGetPayload<{
  include: {
    consumer: true;
  };
}>;

export type GoogleProfileDetailsModelWithRelations = Prisma.GoogleProfileDetailsModelGetPayload<{
  include: {
    consumer: true;
  };
}>;

export type OrganizationDetailsModelWithRelations = Prisma.OrganizationDetailsModelGetPayload<{
  include: {
    consumer: true;
  };
}>;

export type PaymentMethodModelWithRelations = Prisma.PaymentMethodModelGetPayload<{
  include: {
    billingDetails: true;
    consumer: true;
  };
}>;

export type PaymentRequestModelWithRelations = Prisma.PaymentRequestModelGetPayload<{
  include: {
    payer: true;
    requester: true;
    attachments: true;
    ledgerEntries: true;
  };
}>;

export type LedgerEntryModelWithRelations = Prisma.LedgerEntryModelGetPayload<{
  include: {
    consumer: true;
    paymentRequest: true;
    outcomes: true;
    disputes: true;
  };
}>;

export type LedgerEntryOutcomeModelWithRelations = Prisma.LedgerEntryOutcomeModelGetPayload<{
  include: {
    ledgerEntry: true;
  };
}>;

export type LedgerEntryDisputeModelWithRelations = Prisma.LedgerEntryDisputeModelGetPayload<{
  include: {
    ledgerEntry: true;
  };
}>;

export type PaymentRequestAttachmentModelWithRelations = Prisma.PaymentRequestAttachmentModelGetPayload<{
  include: {
    paymentRequest: true;
    requester: true;
    resource: true;
  };
}>;

export type PersonalDetailsModelWithRelations = Prisma.PersonalDetailsModelGetPayload<{
  include: {
    consumer: true;
  };
}>;

export type ResetPasswordModelWithRelations = Prisma.ResetPasswordModelGetPayload<{
  include: {
    consumer: true;
  };
}>;

export type ResourceModelWithRelations = Prisma.ResourceModelGetPayload<{
  include: {
    consumerResources: true;
    attachments: true;
    resourceTags: true;
  };
}>;

export type DocumentTagModelWithRelations = Prisma.DocumentTagModelGetPayload<{
  include: {
    resourceTags: true;
  };
}>;

export type ResourceTagModelWithRelations = Prisma.ResourceTagModelGetPayload<{
  include: {
    resource: true;
    tag: true;
  };
}>;

export type ConsumerSettingsModelWithRelations = Prisma.ConsumerSettingsModelGetPayload<{
  include: {
    consumer: true;
  };
}>;

export type AdminSettingsModelWithRelations = Prisma.AdminSettingsModelGetPayload<{
  include: {
    admin: true;
  };
}>;
