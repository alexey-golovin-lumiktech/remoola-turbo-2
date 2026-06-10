'use client';

import { type CreateRuleData, FieldHint } from './exchange-shared';

type CurrencyOption = { code: string };

export function ExchangeRuleFormSection({
  currencyOptions,
  editingRuleId,
  isPending,
  maxConvertAmountProvided,
  maxConvertAmountValid,
  minIntervalProvided,
  minIntervalValid,
  onCancelEdit,
  onSubmit,
  onTargetBalanceChange,
  onUpdate,
  ruleCurrenciesDiffer,
  ruleForm,
  ruleFormValid,
  ruleTargetBalanceTouched,
  targetBalanceMissing,
  targetBalanceShowError,
  targetBalanceValid,
}: {
  currencyOptions: CurrencyOption[];
  editingRuleId: string | null;
  isPending: boolean;
  maxConvertAmountProvided: boolean;
  maxConvertAmountValid: boolean;
  minIntervalProvided: boolean;
  minIntervalValid: boolean;
  onCancelEdit: () => void;
  onSubmit: () => void;
  onTargetBalanceChange: (value: string) => void;
  onUpdate: (patch: Partial<CreateRuleData>) => void;
  ruleCurrenciesDiffer: boolean;
  ruleForm: CreateRuleData;
  ruleFormValid: boolean;
  ruleTargetBalanceTouched: boolean;
  targetBalanceMissing: boolean;
  targetBalanceShowError: boolean;
  targetBalanceValid: boolean;
}) {
  return (
    <div data-testid={`exchange-create-rule-form`}>
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <select
          aria-label={`Source currency for auto-conversion rule`}
          value={ruleForm.from}
          onChange={(event) => onUpdate({ from: event.target.value })}
          className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-strong) px-4 py-3 text-(--app-text) outline-none"
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
          onChange={(event) => onUpdate({ to: event.target.value })}
          className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-strong) px-4 py-3 text-(--app-text) outline-none"
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
            onChange={(event) => onTargetBalanceChange(event.target.value)}
            placeholder="Target balance"
            aria-invalid={targetBalanceShowError}
            className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-(--app-text) outline-none placeholder:text-(--app-text-faint)"
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
            onChange={(event) => onUpdate({ maxConvertAmount: event.target.value })}
            placeholder="Max convert amount (optional)"
            aria-invalid={!maxConvertAmountValid}
            className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-(--app-text) outline-none placeholder:text-(--app-text-faint)"
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
            onChange={(event) => onUpdate({ minIntervalMinutes: event.target.value })}
            placeholder="Min interval minutes"
            aria-invalid={!minIntervalValid}
            className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-(--app-text) outline-none placeholder:text-(--app-text-faint)"
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
        <label className="flex items-center gap-3 rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-sm text-(--app-text-soft)">
          <input
            type="checkbox"
            checked={ruleForm.enabled}
            onChange={(event) => onUpdate({ enabled: event.target.checked })}
          />
          Enable immediately
        </label>
      </div>

      <button
        type="button"
        disabled={isPending || !ruleFormValid}
        onClick={onSubmit}
        className="mb-3 w-full rounded-2xl bg-(--app-primary) px-4 py-3 font-medium text-(--app-primary-contrast) disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? `Saving...` : editingRuleId ? `Save rule changes` : `Create rule`}
      </button>

      {editingRuleId ? (
        <button
          type="button"
          disabled={isPending}
          onClick={onCancelEdit}
          className="mb-5 w-full rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 font-medium text-(--app-text) disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel edit
        </button>
      ) : null}
    </div>
  );
}
