'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, useState, useTransition } from 'react';

import {
  buildExchangePaginationHref,
  type CreateRuleData,
  type Currency,
  type ExchangeMessage,
  type ExchangeMutationResult,
  type ExchangeRule,
  FieldHint,
  formatMajorCurrency,
  getExchangeCurrencyOptions,
  type UpdateRuleData,
} from './exchange-shared';
import { handleSessionExpiredError } from '../../../lib/session-expired';
import { Panel } from '../../../shared/ui/shell-primitives';

type ExchangeRulesSectionProps = {
  rules: ExchangeRule[];
  currencies: Currency[];
  rulesTotal: number;
  rulesPage: number;
  rulesPageSize: number;
  initialFromCurrency: string;
  initialToCurrency: string;
  onCreateRule: (data: CreateRuleData) => Promise<ExchangeMutationResult>;
  onUpdateRule: (id: string, data: UpdateRuleData) => Promise<ExchangeMutationResult>;
  onDeleteRule: (id: string) => Promise<ExchangeMutationResult>;
  headerAction?: ReactNode;
};

export function ExchangeRulesSection({
  rules,
  currencies,
  rulesTotal,
  rulesPage,
  rulesPageSize,
  initialFromCurrency,
  initialToCurrency,
  onCreateRule,
  onUpdateRule,
  onDeleteRule,
  headerAction,
}: ExchangeRulesSectionProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<ExchangeMessage | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleTargetBalanceTouched, setRuleTargetBalanceTouched] = useState(false);
  const [ruleForm, setRuleForm] = useState<CreateRuleData>({
    from: initialFromCurrency,
    to: initialToCurrency,
    targetBalance: ``,
    maxConvertAmount: ``,
    minIntervalMinutes: `60`,
    enabled: true,
  });

  const currencyOptions = getExchangeCurrencyOptions(currencies);
  const rulesTotalPages = Math.max(1, Math.ceil(rulesTotal / rulesPageSize));
  const ruleCurrenciesDiffer = ruleForm.from !== ruleForm.to;
  const targetBalanceValue = ruleForm.targetBalance.trim();
  const targetBalanceMissing = targetBalanceValue === ``;
  const parsedTargetBalance = targetBalanceMissing ? Number.NaN : Number(targetBalanceValue);
  const targetBalanceValid = !targetBalanceMissing && Number.isFinite(parsedTargetBalance) && parsedTargetBalance >= 0;
  const targetBalanceShowError = ruleTargetBalanceTouched && !targetBalanceValid;
  const maxConvertAmountValue = ruleForm.maxConvertAmount.trim();
  const maxConvertAmountProvided = maxConvertAmountValue !== ``;
  const parsedMaxConvertAmount = maxConvertAmountProvided ? Number(maxConvertAmountValue) : Number.NaN;
  const maxConvertAmountValid =
    !maxConvertAmountProvided || (Number.isFinite(parsedMaxConvertAmount) && parsedMaxConvertAmount > 0);
  const minIntervalValue = ruleForm.minIntervalMinutes.trim();
  const minIntervalProvided = minIntervalValue !== ``;
  const parsedMinInterval = minIntervalProvided ? Number(minIntervalValue) : Number.NaN;
  const minIntervalValid = !minIntervalProvided || (Number.isFinite(parsedMinInterval) && parsedMinInterval >= 1);
  const ruleFormValid = ruleCurrenciesDiffer && targetBalanceValid && maxConvertAmountValid && minIntervalValid;

  const updateRuleForm = (patch: Partial<CreateRuleData>) => {
    setRuleForm((current) => ({ ...current, ...patch }));
    setMessage(null);
  };

  const resetRuleEditor = () => {
    setEditingRuleId(null);
    setRuleTargetBalanceTouched(false);
    setRuleForm({
      from: initialFromCurrency,
      to: initialToCurrency,
      targetBalance: ``,
      maxConvertAmount: ``,
      minIntervalMinutes: `60`,
      enabled: true,
    });
  };

  const handleMutationResult = (result: ExchangeMutationResult) => {
    if (!result.ok) {
      if (handleSessionExpiredError(result.error)) return false;
      setMessage({ type: `error`, text: result.error.message });
      return false;
    }
    return true;
  };

  const applyRulesPage = (nextPage: number) => {
    router.push(
      buildExchangePaginationHref(pathname, searchParams.toString(), {
        rulesPage: String(nextPage),
        rulesPageSize: String(rulesPageSize),
      }),
    );
  };

  return (
    <Panel
      title="Auto conversion rules"
      data-testid={`exchange-rules-section`}
      aside={
        <div className="flex flex-col items-end gap-1 text-right">
          <span>{`Page ${rulesPage} of ${rulesTotalPages} · ${rules.length} shown · ${rulesTotal} total`}</span>
          {headerAction}
        </div>
      }
    >
      {message ? (
        <div
          className={
            message.type === `error`
              ? `mb-4 rounded-2xl border border-transparent bg-[var(--app-danger-soft)] px-4 py-3 text-sm text-[var(--app-danger-text)]`
              : `mb-4 rounded-2xl border border-transparent bg-[var(--app-success-soft)] px-4 py-3 text-sm text-[var(--app-success-text)]`
          }
        >
          {message.text}
        </div>
      ) : null}

      <div data-testid={`exchange-create-rule-form`}>
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <select
            aria-label={`Source currency for auto-conversion rule`}
            value={ruleForm.from}
            onChange={(event) => updateRuleForm({ from: event.target.value })}
            className="w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-strong)] px-4 py-3 text-[var(--app-text)] outline-none"
          >
            {currencyOptions.map((currency) => (
              <option key={`rule-from-${currency.code}`} value={currency.code}>
                {`From: ${currency.code}`}
              </option>
            ))}
          </select>
          <select
            aria-label={`Target currency for auto-conversion rule`}
            value={ruleForm.to}
            onChange={(event) => updateRuleForm({ to: event.target.value })}
            className="w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-strong)] px-4 py-3 text-[var(--app-text)] outline-none"
          >
            {currencyOptions.map((currency) => (
              <option key={`rule-to-${currency.code}`} value={currency.code}>
                {`To: ${currency.code}`}
              </option>
            ))}
          </select>
          {!ruleCurrenciesDiffer ? (
            <div className="md:col-span-2">
              <FieldHint message="Choose two different currencies." tone="error" />
            </div>
          ) : null}
          <div>
            <input
              aria-label={`Target balance threshold`}
              value={ruleForm.targetBalance}
              onChange={(event) => {
                setRuleTargetBalanceTouched(true);
                updateRuleForm({ targetBalance: event.target.value });
              }}
              placeholder="Target balance"
              aria-invalid={targetBalanceShowError}
              className="w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-faint)]"
            />
            <FieldHint
              message={
                targetBalanceMissing
                  ? ruleTargetBalanceTouched
                    ? `Target balance is required.`
                    : `Enter a target balance to create a rule.`
                  : targetBalanceValid
                    ? `Zero is allowed.`
                    : `Enter a valid target balance.`
              }
              tone={targetBalanceShowError ? `error` : `muted`}
            />
          </div>
          <div>
            <input
              aria-label={`Maximum conversion amount per execution`}
              value={ruleForm.maxConvertAmount}
              onChange={(event) => updateRuleForm({ maxConvertAmount: event.target.value })}
              placeholder="Max convert amount (optional)"
              aria-invalid={!maxConvertAmountValid}
              className="w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-faint)]"
            />
            {maxConvertAmountProvided ? (
              <FieldHint
                message={maxConvertAmountValid ? `Cap will limit each run.` : `Enter a valid limit greater than zero.`}
                tone={maxConvertAmountValid ? `muted` : `error`}
              />
            ) : (
              <FieldHint message="Leave blank to remove the cap." />
            )}
          </div>
          <div>
            <input
              aria-label={`Minimum interval between executions in minutes`}
              value={ruleForm.minIntervalMinutes}
              onChange={(event) => updateRuleForm({ minIntervalMinutes: event.target.value })}
              placeholder="Min interval minutes"
              aria-invalid={!minIntervalValid}
              className="w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-faint)]"
            />
            {minIntervalProvided ? (
              <FieldHint
                message={
                  minIntervalValid
                    ? `Rule can run no more often than this interval.`
                    : `Interval must be at least 1 minute.`
                }
                tone={minIntervalValid ? `muted` : `error`}
              />
            ) : (
              <FieldHint
                message={editingRuleId ? `Leave blank to keep the current interval.` : `Leave blank to use 60 minutes.`}
              />
            )}
          </div>
          <label className="flex items-center gap-3 rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-sm text-[var(--app-text-soft)]">
            <input
              type="checkbox"
              checked={ruleForm.enabled}
              onChange={(event) => updateRuleForm({ enabled: event.target.checked })}
            />
            Enable immediately
          </label>
        </div>

        <button
          type="button"
          disabled={isPending || !ruleFormValid}
          onClick={() => {
            setMessage(null);
            startTransition(async () => {
              const result = editingRuleId ? await onUpdateRule(editingRuleId, ruleForm) : await onCreateRule(ruleForm);
              if (!handleMutationResult(result)) return;
              resetRuleEditor();
              setMessage({
                type: `success`,
                text: result.ok
                  ? (result.message ?? (editingRuleId ? `Rule updated` : `Rule created`))
                  : `Rule updated`,
              });
              router.refresh();
            });
          }}
          className="mb-3 w-full rounded-2xl bg-[var(--app-primary)] px-4 py-3 font-medium text-[var(--app-primary-contrast)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? `Saving...` : editingRuleId ? `Save rule changes` : `Create rule`}
        </button>

        {editingRuleId ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              resetRuleEditor();
              setMessage(null);
            }}
            className="mb-5 w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 font-medium text-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel edit
          </button>
        ) : null}
      </div>

      <div data-testid={`exchange-rules-list`}>
        {rules.length === 0 ? (
          <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-10 text-center text-sm text-[var(--app-text-muted)]">
            No auto-rules configured yet.
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium text-[var(--app-text)]">
                      {rule.fromCurrency} {`->`} {rule.toCurrency}
                    </div>
                    <div className="mt-1 text-sm text-[var(--app-text-muted)]">
                      {`Keep ${formatMajorCurrency(rule.targetBalance, rule.fromCurrency)}`}
                      {rule.maxConvertAmount != null
                        ? ` • cap ${formatMajorCurrency(rule.maxConvertAmount, rule.fromCurrency)}`
                        : ``}
                      {` • every ${rule.minIntervalMinutes} min`}
                    </div>
                  </div>
                  <div className="text-sm text-[var(--app-text-muted)]">{rule.enabled ? `Enabled` : `Paused`}</div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      setEditingRuleId(rule.id);
                      setRuleTargetBalanceTouched(false);
                      setRuleForm({
                        from: rule.fromCurrency,
                        to: rule.toCurrency,
                        targetBalance: String(rule.targetBalance),
                        maxConvertAmount: rule.maxConvertAmount != null ? String(rule.maxConvertAmount) : ``,
                        minIntervalMinutes: String(rule.minIntervalMinutes),
                        enabled: rule.enabled,
                      });
                      setMessage(null);
                    }}
                    className="rounded-xl border border-[color:var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm text-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      setMessage(null);
                      setPendingActionId(`toggle-rule:${rule.id}`);
                      startTransition(async () => {
                        const result = await onUpdateRule(rule.id, { enabled: !rule.enabled });
                        setPendingActionId(null);
                        if (!handleMutationResult(result)) return;
                        if (editingRuleId === rule.id) {
                          setRuleForm((current) => ({ ...current, enabled: !rule.enabled }));
                        }
                        setMessage({
                          type: `success`,
                          text: result.ok ? (result.message ?? `Rule updated`) : `Rule updated`,
                        });
                        router.refresh();
                      });
                    }}
                    className="rounded-xl border border-transparent bg-[var(--app-primary-soft)] px-3 py-2 text-sm text-[var(--app-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {pendingActionId === `toggle-rule:${rule.id}` ? `Updating...` : rule.enabled ? `Pause` : `Enable`}
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      setMessage(null);
                      setPendingActionId(`delete-rule:${rule.id}`);
                      startTransition(async () => {
                        const result = await onDeleteRule(rule.id);
                        setPendingActionId(null);
                        if (!handleMutationResult(result)) return;
                        if (editingRuleId === rule.id) {
                          resetRuleEditor();
                        }
                        setMessage({
                          type: `success`,
                          text: result.ok ? (result.message ?? `Rule deleted`) : `Rule deleted`,
                        });
                        router.refresh();
                      });
                    }}
                    className="rounded-xl border border-transparent bg-[var(--app-danger-soft)] px-3 py-2 text-sm text-[var(--app-danger-text)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {pendingActionId === `delete-rule:${rule.id}` ? `Deleting...` : `Delete`}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={rulesPage <= 1}
          onClick={() => applyRulesPage(rulesPage - 1)}
          className="rounded-xl border border-[color:var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm text-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={rulesPage >= rulesTotalPages}
          onClick={() => applyRulesPage(rulesPage + 1)}
          className="rounded-xl border border-[color:var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm text-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </Panel>
  );
}
