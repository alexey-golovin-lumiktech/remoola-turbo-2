import { type PaymentMethod } from './banking-form-helpers';
import { getMethodKind, getMethodLabel, getMethodMeta } from './banking-helpers';
import { StatusPill } from '../../../shared/ui/shell-primitives';

type PaymentMethodSection = {
  id: string;
  title: string;
  description: string;
  items: PaymentMethod[];
  emptyText: string;
};

type Props = {
  accountsCount: number;
  isPending: boolean;
  pendingActionId: string | null;
  sections: PaymentMethodSection[];
  onDelete: (account: PaymentMethod) => void;
  onSetDefault: (account: PaymentMethod) => void;
};

export function SavedPaymentMethodsList({
  accountsCount,
  isPending,
  pendingActionId,
  sections,
  onDelete,
  onSetDefault,
}: Props) {
  if (accountsCount === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-10 text-center text-sm text-[var(--app-text-muted)]">
        No payment methods connected yet.
      </div>
    );
  }

  return (
    <div className="mt-5 grid gap-5">
      {sections.map((section) => (
        <div key={section.id} className="grid gap-3">
          <div className="grid gap-1">
            <div className="text-sm font-medium text-[var(--app-text)]">{section.title}</div>
            <div className="text-sm text-[var(--app-text-muted)]">{section.description}</div>
          </div>

          {section.items.length === 0 ? (
            <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-4 text-sm text-[var(--app-text-muted)]">
              {section.emptyText}
            </div>
          ) : (
            section.items.map((account) => {
              const kind = getMethodKind(account);

              return (
                <div
                  key={account.id}
                  className="rounded-[28px] border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] p-4"
                >
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                    <div className="grid gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-3 py-1 text-xs ${kind.tone}`}>{kind.label}</span>
                        <StatusPill status={account.defaultSelected ? `Default` : `Connected`} />
                      </div>
                      <div className="font-medium text-[var(--app-text)]">{getMethodLabel(account)}</div>
                      <div className="text-sm text-[var(--app-text-muted)]">{getMethodMeta(account)}</div>
                      <div className="text-sm text-[var(--app-text-soft)]">{kind.detail}</div>
                      {account.billingDetails?.name ? (
                        <div className="text-sm text-[var(--app-text-faint)]">
                          Billing: {account.billingDetails.name}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2 md:justify-end">
                      <button
                        type="button"
                        disabled={isPending || account.defaultSelected}
                        onClick={() => onSetDefault(account)}
                        className="rounded-2xl border border-[var(--app-primary)]/20 px-3 py-2 text-sm text-[var(--app-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {pendingActionId === `default:${account.id}`
                          ? `Updating...`
                          : account.defaultSelected
                            ? `Default`
                            : `Set default`}
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => onDelete(account)}
                        className="rounded-2xl border border-[var(--app-danger-text)]/20 px-3 py-2 text-sm text-[var(--app-danger-text)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {pendingActionId === `delete:${account.id}` ? `Deleting...` : `Delete`}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ))}
    </div>
  );
}
