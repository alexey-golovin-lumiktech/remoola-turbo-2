export function renderMethodLabel(paymentMethod: {
  type: string;
  brand: string | null;
  last4: string | null;
  bankLast4: string | null;
}) {
  const suffix = paymentMethod.last4 ?? paymentMethod.bankLast4 ?? `----`;
  if (paymentMethod.type === `CREDIT_CARD`) {
    return `${paymentMethod.brand ?? `Card`} •••• ${suffix}`;
  }

  return `${paymentMethod.type} •••• ${suffix}`;
}
