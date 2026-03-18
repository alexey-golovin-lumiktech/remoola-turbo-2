import { z } from 'zod';

import { emailOptionalSchema, emailSchema } from '@remoola/api-types';

export const contactAddressSchema = z.object({
  street: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
});

export const contactSchema = z.object({
  id: z.string(),
  name: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  address: contactAddressSchema.optional().nullable(),
  createdAt: z.string().optional(),
});

export const contactListSchema = z.array(contactSchema);

export const contactPaymentRequestSchema = z.object({
  id: z.string(),
  amount: z.string(),
  status: z.string(),
  createdAt: z.string(),
  description: z.string().nullable().optional(),
});

export const contactDocumentSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  createdAt: z.string().optional(),
});

export const contactDetailsSchema = z.object({
  id: z.string(),
  name: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  address: contactAddressSchema.optional().nullable(),
  createdAt: z.string().optional(),
  paymentRequests: z.array(contactPaymentRequestSchema),
  documents: z.array(contactDocumentSchema),
});

export type ContactAddress = z.infer<typeof contactAddressSchema>;
export type Contact = z.infer<typeof contactSchema>;
export type ContactPaymentRequest = z.infer<typeof contactPaymentRequestSchema>;
export type ContactDocument = z.infer<typeof contactDocumentSchema>;
export type ContactDetails = z.infer<typeof contactDetailsSchema>;

export const contactParamsSchema = z.object({
  contactId: z.string().min(1),
});

export const createContactSchema = z.object({
  email: emailSchema,
  name: z.string().min(1, `Name is required`).optional().nullable(),
  address: contactAddressSchema.optional().nullable(),
});

export const updateContactSchema = z.object({
  email: emailOptionalSchema.optional(),
  name: z.string().optional().nullable(),
  address: contactAddressSchema.optional().nullable(),
});
