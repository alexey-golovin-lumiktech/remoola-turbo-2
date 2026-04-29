import { type PaymentMethod } from './banking-form-helpers';
import { getMethodLabel } from './banking-helpers';
import { MetricCard } from '../../../shared/ui/shell-primitives';

type Props = {
  accountsCount: number;
  defaultBankAccount: PaymentMethod | null;
  defaultCard: PaymentMethod | null;
  reusableCardsCount: number;
};

export function BankingSummary({ accountsCount, defaultBankAccount, defaultCard, reusableCardsCount }: Props) {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard icon="◈" label="Accounts" value={String(accountsCount)} sublabel="Connected methods" />
      <MetricCard
        icon="★"
        label="Default bank"
        value={defaultBankAccount ? getMethodLabel(defaultBankAccount) : `—`}
        sublabel="Type-scoped bank default"
      />
      <MetricCard
        icon="✦"
        label="Default card"
        value={defaultCard ? getMethodLabel(defaultCard) : `—`}
        sublabel="Shared across manual and reusable cards"
      />
      <MetricCard
        icon="⟳"
        label="Reusable payer cards"
        value={String(reusableCardsCount)}
        sublabel="Available for one-click payer payments"
      />
    </section>
  );
}
