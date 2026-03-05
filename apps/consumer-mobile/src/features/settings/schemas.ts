import { z } from 'zod';

export const profileSchema = z.object({
  id: z.string(),
  accountType: z.string(),
  personalDetails: z
    .object({
      firstName: z.string().nullable().optional(),
      lastName: z.string().nullable().optional(),
      citizenOf: z.string().nullable().optional(),
      passportOrIdNumber: z.string().nullable().optional(),
      legalStatus: z.string().nullable().optional(),
      dateOfBirth: z.string().nullable().optional(),
      countryOfTaxResidence: z.string().nullable().optional(),
      taxId: z.string().nullable().optional(),
      phoneNumber: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  addressDetails: z
    .object({
      postalCode: z.string().nullable().optional(),
      country: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      street: z.string().nullable().optional(),
      state: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  organizationDetails: z
    .object({
      name: z.string().nullable().optional(),
      consumerRole: z.string().nullable().optional(),
      consumerRoleOther: z.string().nullable().optional(),
      size: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

export type Profile = z.infer<typeof profileSchema>;

export const settingsSchema = z.object({
  theme: z.string().nullable().optional(),
  preferredCurrency: z.string().nullable().optional(),
});

export type Settings = z.infer<typeof settingsSchema>;
