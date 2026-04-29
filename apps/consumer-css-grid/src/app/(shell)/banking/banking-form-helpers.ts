import { isCardExpired, isValidEmail, phoneDigitsCount } from './banking-helpers';

export type PaymentMethod = {
  id: string;
  type: string;
  brand: string;
  last4: string;
  expMonth: string | null;
  expYear: string | null;
  defaultSelected: boolean;
  reusableForPayerPayments: boolean;
  billingDetails: {
    id: string;
    email: string | null;
    name: string | null;
    phone: string | null;
  } | null;
};

export type BankFormState = {
  bankName: string;
  last4: string;
  billingName: string;
  billingEmail: string;
  billingPhone: string;
  defaultSelected: boolean;
};

export type CardFormState = {
  brand: string;
  last4: string;
  expMonth: string;
  expYear: string;
  billingName: string;
  billingEmail: string;
  billingPhone: string;
  defaultSelected: boolean;
};

export const initialBankForm: BankFormState = {
  bankName: ``,
  last4: ``,
  billingName: ``,
  billingEmail: ``,
  billingPhone: ``,
  defaultSelected: true,
};

export const initialCardForm: CardFormState = {
  brand: ``,
  last4: ``,
  expMonth: ``,
  expYear: ``,
  billingName: ``,
  billingEmail: ``,
  billingPhone: ``,
  defaultSelected: true,
};

export function getBankFormValidity(form: BankFormState) {
  const emailValid = form.billingEmail.length === 0 || isValidEmail(form.billingEmail);
  const phoneValid = form.billingPhone.length === 0 || phoneDigitsCount(form.billingPhone) >= 7;
  const formValid =
    form.bankName.trim().length > 0 &&
    /^\d{4}$/.test(form.last4) &&
    form.billingName.trim().length > 0 &&
    emailValid &&
    phoneValid;

  return { emailValid, formValid, phoneValid };
}

export function getCardFormValidity(form: CardFormState) {
  const emailValid = form.billingEmail.length === 0 || isValidEmail(form.billingEmail);
  const phoneValid = form.billingPhone.length === 0 || phoneDigitsCount(form.billingPhone) >= 7;
  const expired = isCardExpired(form.expMonth, form.expYear);
  const formValid =
    form.brand.trim().length > 0 &&
    /^\d{4}$/.test(form.last4) &&
    /^(0[1-9]|1[0-2])$/.test(form.expMonth) &&
    /^\d{4}$/.test(form.expYear) &&
    !expired &&
    form.billingName.trim().length > 0 &&
    emailValid &&
    phoneValid;

  return { emailValid, expired, formValid, phoneValid };
}

export function getPaymentMethodSections(
  bankAccounts: PaymentMethod[],
  manualCards: PaymentMethod[],
  reusableCards: PaymentMethod[],
) {
  return [
    {
      id: `bank-accounts`,
      title: `Bank accounts`,
      description: `Used for payouts and manual Banking records.`,
      items: bankAccounts,
      emptyText: `No bank accounts saved yet.`,
    },
    {
      id: `manual-cards`,
      title: `Manual card records`,
      description: `Billing and display metadata only. These do not power one-click payer payments.`,
      items: manualCards,
      emptyText: `No manual Banking card records saved yet.`,
    },
    {
      id: `reusable-cards`,
      title: `Reusable Stripe cards`,
      description: `Saved with Stripe for one-click payer payments and still visible in Banking.`,
      items: reusableCards,
      emptyText: `No reusable payer cards saved yet.`,
    },
  ];
}
