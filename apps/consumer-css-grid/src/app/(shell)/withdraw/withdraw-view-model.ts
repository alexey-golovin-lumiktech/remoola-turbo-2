type PaymentMethod = {
  id: string;
  type: string;
  brand: string | null;
  last4: string | null;
  defaultSelected?: boolean;
};

type Input = {
  activeTab: `withdraw` | `transfer`;
  balances: Record<string, number> | null;
  bankMethods: PaymentMethod[];
  isPending: boolean;
  paymentMethodId: string;
  recipient: string;
  transferAmount: string;
  transferCurrency: string;
  withdrawAmount: string;
  withdrawCurrency: string;
};

export function buildWithdrawViewModel({
  activeTab,
  balances,
  bankMethods,
  isPending,
  paymentMethodId,
  recipient,
  transferAmount,
  transferCurrency,
  withdrawAmount,
  withdrawCurrency,
}: Input) {
  const hasBankMethod = bankMethods.length > 0;
  const hasPositiveBalance = Object.values(balances ?? {}).some((value) => value > 0);
  const withdrawSelectedBalance = balances?.[withdrawCurrency] ?? 0;
  const transferSelectedBalance = balances?.[transferCurrency] ?? 0;
  const parsedWithdrawAmount = Number(withdrawAmount);
  const isWithdrawAmountValid = Number.isFinite(parsedWithdrawAmount) && parsedWithdrawAmount > 0;
  const requestedWithdrawMinorAmount = isWithdrawAmountValid ? Math.round(parsedWithdrawAmount * 100) : 0;
  const hasWithdrawInsufficientFunds = isWithdrawAmountValid && requestedWithdrawMinorAmount > withdrawSelectedBalance;
  const parsedTransferAmount = Number(transferAmount);
  const isTransferAmountValid = Number.isFinite(parsedTransferAmount) && parsedTransferAmount > 0;
  const requestedTransferMinorAmount = isTransferAmountValid ? Math.round(parsedTransferAmount * 100) : 0;
  const hasTransferInsufficientFunds = isTransferAmountValid && requestedTransferMinorAmount > transferSelectedBalance;
  const withdrawSubmitDisabled =
    isPending ||
    !hasBankMethod ||
    !hasPositiveBalance ||
    !paymentMethodId ||
    !isWithdrawAmountValid ||
    hasWithdrawInsufficientFunds;
  const transferSubmitDisabled =
    isPending || !hasPositiveBalance || !recipient.trim() || !isTransferAmountValid || hasTransferInsufficientFunds;
  const withdrawSubmitLabel = !hasBankMethod
    ? `Connect a bank account to continue`
    : !hasPositiveBalance
      ? `No withdrawable balance available`
      : hasWithdrawInsufficientFunds
        ? `Amount exceeds available balance`
        : isPending
          ? `Submitting...`
          : `Create withdrawal`;
  const transferSubmitLabel = !hasPositiveBalance
    ? `No transferable balance available`
    : hasTransferInsufficientFunds
      ? `Amount exceeds available balance`
      : isPending
        ? `Submitting...`
        : `Send transfer`;

  return {
    activeBalanceAmount: activeTab === `withdraw` ? withdrawSelectedBalance : transferSelectedBalance,
    activeBalanceCurrency: activeTab === `withdraw` ? withdrawCurrency : transferCurrency,
    hasBankMethod,
    hasPositiveBalance,
    hasTransferInsufficientFunds,
    hasWithdrawInsufficientFunds,
    isTransferAmountValid,
    isWithdrawAmountValid,
    transferSelectedBalance,
    transferSubmitDisabled,
    transferSubmitLabel,
    withdrawSelectedBalance,
    withdrawSubmitDisabled,
    withdrawSubmitLabel,
  };
}
