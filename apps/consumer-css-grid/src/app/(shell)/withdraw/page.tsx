import { WithdrawFlowClient } from './WithdrawFlowClient';
import { getContextualHelpGuides, HELP_CONTEXT_ROUTE } from '../../../features/help/get-contextual-help-guides';
import { HELP_GUIDE_SLUG } from '../../../features/help/guide-registry';
import { HelpContextualGuides } from '../../../features/help/ui';
import { getAvailableBalances, getPaymentHistory, getPaymentMethods } from '../../../lib/consumer-api.server';
import { ArrowDownIcon } from '../../../shared/ui/icons/ArrowDownIcon';
import { PageHeader, Panel, StatusPill } from '../../../shared/ui/shell-primitives';

function formatMajorCurrency(amount: number, currencyCode: string) {
  return new Intl.NumberFormat(`en-US`, {
    style: `currency`,
    currency: currencyCode,
  }).format(amount);
}

export default async function WithdrawPage() {
  const [balances, historyResponse, paymentMethodsResponse] = await Promise.all([
    getAvailableBalances({ redirectTo: `/withdraw` }),
    getPaymentHistory({ limit: 5, offset: 0, type: `USER_PAYOUT` }, { redirectTo: `/withdraw` }),
    getPaymentMethods({ redirectTo: `/withdraw` }),
  ]);
  const bankMethods = (paymentMethodsResponse?.items ?? []).filter((method) => method.type === `BANK_ACCOUNT`);
  const defaultDestination =
    bankMethods.find((method) => method.defaultSelected)?.brand ?? bankMethods[0]?.brand ?? `No bank account connected`;
  const paymentMethodById = new Map(bankMethods.map((method) => [method.id, method]));
  const withdrawalRows = historyResponse?.items ?? [];
  const withdrawHelpGuides = getContextualHelpGuides({
    route: HELP_CONTEXT_ROUTE.WITHDRAW,
    preferredSlugs: [
      HELP_GUIDE_SLUG.WITHDRAWAL_OVERVIEW,
      HELP_GUIDE_SLUG.WITHDRAWAL_MOVE_FUNDS,
      HELP_GUIDE_SLUG.WITHDRAWAL_COMMON_ISSUES,
      HELP_GUIDE_SLUG.BANKING_ADD_AND_MANAGE_METHODS,
    ],
    limit: 4,
  });

  return (
    <div>
      <PageHeader
        title="Move funds"
        subtitle="Withdraw to your bank or transfer available balance to another consumer account."
        icon={<ArrowDownIcon className="h-10 w-10 text-white" />}
      />
      <HelpContextualGuides
        guides={withdrawHelpGuides}
        compact
        title="Check withdrawal prerequisites before moving funds"
        description="These guides cover available-balance rules, payout destination setup, pending withdrawal states, and the safest recovery path when a transfer or withdrawal is blocked."
        className="mb-5"
      />

      {/* Asymmetric 2-col: xl:grid-cols-[0.9fr_1.1fr] */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Withdraw or transfer" aside="Available balance only">
          <WithdrawFlowClient balances={balances} bankMethods={bankMethods} />
        </Panel>

        <Panel title="Recent withdrawal requests">
          {withdrawalRows.length === 0 ? (
            <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-10 text-center text-sm text-[var(--app-text-muted)]">
              No withdrawal history yet.
            </div>
          ) : (
            <div className="space-y-3">
              {withdrawalRows.map((row) => {
                const method = row.paymentMethodId ? paymentMethodById.get(row.paymentMethodId) : null;
                const destination = row.paymentMethodLabel ?? method?.brand ?? defaultDestination;

                return (
                  <div
                    key={row.id}
                    className="flex items-center justify-between rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] p-4"
                  >
                    <div>
                      <div className="font-medium text-[var(--app-text)]">
                        {formatMajorCurrency(Math.abs(row.amount), row.currencyCode)}
                      </div>
                      <div className="mt-1 text-sm text-[var(--app-text-muted)]">{destination}</div>
                    </div>
                    <StatusPill status={row.status} />
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </section>
    </div>
  );
}
