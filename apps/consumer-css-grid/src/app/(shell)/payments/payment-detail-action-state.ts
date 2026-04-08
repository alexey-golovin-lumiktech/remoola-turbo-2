export function getPaymentDetailActionState(input: { status: string; role: string; paymentRail?: string | null }) {
  const normalizedStatus = input.status.toUpperCase();
  const normalizedRole = input.role.toUpperCase();
  const normalizedRail = input.paymentRail?.toUpperCase() ?? ``;

  const canSend = normalizedStatus === `DRAFT` && normalizedRole === `REQUESTER`;
  const canPay = normalizedStatus === `PENDING` && normalizedRole === `PAYER`;
  const canGenerateInvoice = normalizedRole === `REQUESTER` && normalizedStatus !== `DRAFT`;
  const canPayWithCard = canPay && normalizedRail !== `BANK_TRANSFER`;
  const isBankTransferPending = canPay && normalizedRail === `BANK_TRANSFER`;
  const invoiceSourceLabel = normalizedStatus === `DRAFT` ? `current draft details` : `current payment details`;
  const aside = canSend
    ? `Draft request`
    : canPay
      ? `Payment pending`
      : canGenerateInvoice
        ? `Requester tools`
        : `No actions required`;
  const showEmptyState = !canSend && !canPayWithCard && !isBankTransferPending && !canGenerateInvoice;

  return {
    canSend,
    canPay,
    canGenerateInvoice,
    canPayWithCard,
    isBankTransferPending,
    invoiceSourceLabel,
    aside,
    showEmptyState,
  };
}
