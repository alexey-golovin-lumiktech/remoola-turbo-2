import { type DashboardBalanceBreakdownItem, formatCurrencyFromMinor } from './dashboard-view-model';

export function DashboardCurrencyBreakdownSection({
  balanceBreakdown,
  settledCurrencyCode,
}: {
  balanceBreakdown: DashboardBalanceBreakdownItem[];
  settledCurrencyCode: string;
}) {
  if (balanceBreakdown.length <= 1) return null;

  return (
    <section className="mt-4 rounded-[28px] border border-(--app-border) bg-(--app-surface) p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-sm uppercase tracking-[0.3em] text-(--app-primary)">Currency breakdown</div>
          <h2 className="mt-1 text-2xl font-semibold text-(--app-text)">Multiple wallet currencies are active</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-(--app-text-soft)">
            The primary cards stay pinned to {settledCurrencyCode}. Use this breakdown to compare settled and spendable
            balances across each active currency without changing wallet balance semantics.
          </p>
        </div>
        <div className="text-sm text-(--app-text-muted)">{balanceBreakdown.length} active currencies</div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {balanceBreakdown.map((currency) => (
          <div
            key={currency.currencyCode}
            className="rounded-[24px] border border-(--app-border) bg-(--app-surface-muted) px-4 py-4 text-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-semibold text-(--app-text)">{currency.currencyCode}</div>
              {currency.isPrimary ? (
                <span className="rounded-full border border-transparent bg-(--app-primary-soft) px-3 py-1 text-xs uppercase tracking-[0.2em] text-(--app-primary)">
                  Primary summary
                </span>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-(--app-border) bg-(--app-surface) px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-(--app-text-faint)">Settled</div>
                <div className="mt-2 text-base font-medium text-(--app-success-text)">
                  {formatCurrencyFromMinor(currency.settledCents, currency.currencyCode)}
                </div>
                <div className="mt-1 text-xs text-(--app-text-muted)">Completed entries only</div>
              </div>
              <div className="rounded-2xl border border-(--app-border) bg-(--app-surface) px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-(--app-text-faint)">Available</div>
                <div className="mt-2 text-base font-medium text-(--app-primary)">
                  {formatCurrencyFromMinor(currency.availableCents, currency.currencyCode)}
                </div>
                <div className="mt-1 text-xs text-(--app-text-muted)">Spendable now</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
