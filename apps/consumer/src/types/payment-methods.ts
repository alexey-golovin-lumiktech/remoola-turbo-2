export type PaymentMethodType = `CREDIT_CARD` | `BANK_ACCOUNT`;

export type BillingDetails = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
};

/**
 * Shape returned from NestJS for a consumer's payment methods.
 * Matches Prisma PaymentMethodModel + BillingDetailsModel.
 */
export type PaymentMethodItem = {
  id: string;

  type: PaymentMethodType;

  // Base attributes
  defaultSelected: boolean;
  brand: string;
  last4: string;

  expMonth?: string | null;
  expYear?: string | null;

  serviceFee: number;

  billingDetails?: BillingDetails | null;

  // Foreign keys
  billingDetailsId: string;
  consumerId: string;

  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

/** Returned by GET /consumer/payment-methods */
export type PaymentMethodsResponse = {
  items: PaymentMethodItem[];
};

/** Add new payment method (Stripe or manual bank) */
export type CreatePaymentMethodDto = {
  type: PaymentMethodType;

  defaultSelected?: boolean;

  // For cards
  brand?: string;
  last4?: string;
  expMonth?: string;
  expYear?: string;

  // Billing details
  billingName?: string;
  billingEmail?: string;
  billingPhone?: string;

  /** Stripe SetupIntent ID if created via Stripe */
  setupIntentId?: string;
};

/** Update existing payment method */
export type UpdatePaymentMethodDto = {
  billingName?: string;
  billingEmail?: string;
  billingPhone?: string;
  defaultSelected?: boolean;
};

/**
 * Stripe setup intent response used in AddPaymentMethodModal
 */
export type StripeSetupIntentPayload = {
  clientSecret: string;
  setupIntentId: string;
};
