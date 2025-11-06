import 'dotenv/config';
import generated from '../generated/prisma/index.js';

const globalForPrisma = global as unknown as { prisma: generated.PrismaClient };
const datasourceUrl = `postgresql://wirebill:wirebill@127.0.0.1:5433/wirebill`;

export const prisma = globalForPrisma.prisma || new generated.PrismaClient({ datasourceUrl });

if (process.env.NODE_ENV !== `production`) globalForPrisma.prisma = prisma;

export type IAccessRefreshTokenModel = generated.AccessRefreshToken;
export type IAddressDetailsModel = generated.AddressDetails;
export type IAdminModel = generated.Admin;
export type IBillingDetailsModel = generated.BillingDetails;
export type IConsumerModel = generated.Consumer;
export type IConsumerResourceModel = generated.ConsumerResource;
export type IContactModel = generated.Contact;
export type IExchangeRateModel = generated.ExchangeRate;
export type IGoogleProfileDetailsModel = generated.GoogleProfileDetails;
export type IOrganizationDetailsModel = generated.OrganizationDetails;
export type IPaymentMethodModel = generated.PaymentMethod;
export type IPaymentRequestModel = generated.PaymentRequest;
export type IPaymentRequestAttachmentModel = generated.PaymentRequestAttachment;
export type IPersonalDetailsModel = generated.PersonalDetails;
export type IResetPasswordModel = generated.ResetPassword;
export type IResourceModel = generated.Resource;
export type ITransactionModel = generated.Transaction;

export * from '../generated/prisma/index.js'; // exports generated types from prisma
