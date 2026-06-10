'use client';

import { type ExchangeRule, formatMajorCurrency } from './exchange-shared';
import { shellContainerBase, shellEmptyState } from '../../../shared/ui/shell-card-tokens';

export function ExchangeRulesList({
  isPending,
  onDelete,
  onEdit,
  onToggle,
  pendingActionId,
  rules,
}: {
  isPending: boolean;
  onDelete: (ruleId: string) => void;
  onEdit: (rule: ExchangeRule) => void;
  onToggle: (rule: ExchangeRule) => void;
  pendingActionId: string | null;
  rules: ExchangeRule[];
}) {
  return (
    <div data-testid={`exchange-rules-list`}>
      {rules.length === 0 ? (
        <div className={shellEmptyState}>No auto-rules configured yet.</div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div key={rule.id} className={shellContainerBase}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium text-(--app-text)">
                    {rule.fromCurrency} {`->`} {rule.toCurrency}
                  </div>
                  <div className="mt-1 text-sm text-(--app-text-muted)">
                    {`Keep ${formatMajorCurrency(rule.targetBalance, rule.fromCurrency)}`}
                    {rule.maxConvertAmount != null
                      ? ` • cap ${formatMajorCurrency(rule.maxConvertAmount, rule.fromCurrency)}`
                      : ``}
                    {` • every ${rule.minIntervalMinutes} min`}
                  </div>
                </div>
                <div className="text-sm text-(--app-text-muted)">{rule.enabled ? `Enabled` : `Paused`}</div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => onEdit(rule)}
                  className="rounded-xl border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--app-text) disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => onToggle(rule)}
                  className="rounded-xl border border-transparent bg-(--app-primary-soft) px-3 py-2 text-sm text-(--app-primary) disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pendingActionId === `toggle-rule:${rule.id}` ? `Updating...` : rule.enabled ? `Pause` : `Enable`}
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => onDelete(rule.id)}
                  className="rounded-xl border border-transparent bg-(--app-danger-soft) px-3 py-2 text-sm text-(--app-danger-text) disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pendingActionId === `delete-rule:${rule.id}` ? `Deleting...` : `Delete`}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
