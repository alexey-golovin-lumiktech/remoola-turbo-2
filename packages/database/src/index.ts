import 'dotenv/config';
import generated from '../generated/prisma/index.js';

const globalForPrisma = global as unknown as { prisma: generated.PrismaClient };
const datasourceUrl = `postgresql://wirebill:wirebill@127.0.0.1:5433/wirebill`;

export const prisma = globalForPrisma.prisma || new generated.PrismaClient({ datasourceUrl });

if (process.env.NODE_ENV !== `production`) globalForPrisma.prisma = prisma;

// export type IPrismaAccessRefreshTokenModel = generated.AccessRefreshToken;
// export type IPrismaAddressDetailsModel = generated.AddressDetails;
// export type IPrismaAdminModel = generated.Admin;
// export type IPrismaBillingDetailsModel = generated.BillingDetails;
// export type IPrismaConsumerModel = generated.Consumer;
// export type IPrismaConsumerResourceModel = generated.ConsumerResource;
// export type IPrismaContactModel = generated.Contact;
// export type IPrismaExchangeRateModel = generated.ExchangeRate;
// export type IPrismaGoogleProfileDetailsModel = generated.GoogleProfileDetails;
// export type IPrismaOrganizationDetailsModel = generated.OrganizationDetails;
// export type IPrismaPaymentMethodModel = generated.PaymentMethod;
// export type IPrismaPaymentRequestModel = generated.PaymentRequest;
// export type IPrismaPaymentRequestAttachmentModel = generated.PaymentRequestAttachment;
// export type IPrismaPersonalDetailsModel = generated.PersonalDetails;
// export type IPrismaResetPasswordModel = generated.ResetPassword;
// export type IPrismaResourceModel = generated.Resource;
// export type IPrismaTransactionModel = generated.Transaction;

export * from '../generated/prisma/index.js'; // exports generated types from prisma
