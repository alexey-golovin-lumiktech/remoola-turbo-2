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
  getExchangeCurrencyOptions,
  type UpdateRuleData,
} from './exchange-shared';
import { ExchangeRuleFormSection } from './ExchangeRuleFormSection';
import { ExchangeRulesList } from './ExchangeRulesList';
import { ExchangeRulesPagination } from './ExchangeRulesPagination';
import { handleSessionExpiredError } from '../../../lib/session-expired';
import { Panel } from '../../../shared/ui/shell-panel';

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

  const handleTargetBalanceChange = (value: string) => {
    setRuleTargetBalanceTouched(true);
    updateRuleForm({ targetBalance: value });
  };

  const handleSubmitRule = () => {
    setMessage(null);
    startTransition(async () => {
      const result = editingRuleId ? await onUpdateRule(editingRuleId, ruleForm) : await onCreateRule(ruleForm);
      if (!handleMutationResult(result)) return;
      resetRuleEditor();
      setMessage({
        type: `success`,
        text: result.ok ? (result.message ?? (editingRuleId ? `Rule updated` : `Rule created`)) : `Rule updated`,
      });
      router.refresh();
    });
  };

  const handleCancelEdit = () => {
    resetRuleEditor();
    setMessage(null);
  };

  const handleEditRule = (rule: ExchangeRule) => {
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
  };

  const handleToggleRule = (rule: ExchangeRule) => {
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
  };

  const handleDeleteRule = (ruleId: string) => {
    setMessage(null);
    setPendingActionId(`delete-rule:${ruleId}`);
    startTransition(async () => {
      const result = await onDeleteRule(ruleId);
      setPendingActionId(null);
      if (!handleMutationResult(result)) return;
      if (editingRuleId === ruleId) {
        resetRuleEditor();
      }
      setMessage({
        type: `success`,
        text: result.ok ? (result.message ?? `Rule deleted`) : `Rule deleted`,
      });
      router.refresh();
    });
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
              ? `mb-4 rounded-2xl border border-transparent bg-(--app-danger-soft) px-4 py-3 text-sm text-(--app-danger-text)`
              : `mb-4 rounded-2xl border border-transparent bg-(--app-success-soft) px-4 py-3 text-sm text-(--app-success-text)`
          }
        >
          {message.text}
        </div>
      ) : null}

      <ExchangeRuleFormSection
        currencyOptions={currencyOptions}
        editingRuleId={editingRuleId}
        isPending={isPending}
        maxConvertAmountProvided={maxConvertAmountProvided}
        maxConvertAmountValid={maxConvertAmountValid}
        minIntervalProvided={minIntervalProvided}
        minIntervalValid={minIntervalValid}
        onCancelEdit={handleCancelEdit}
        onSubmit={handleSubmitRule}
        onTargetBalanceChange={handleTargetBalanceChange}
        onUpdate={updateRuleForm}
        ruleCurrenciesDiffer={ruleCurrenciesDiffer}
        ruleForm={ruleForm}
        ruleFormValid={ruleFormValid}
        ruleTargetBalanceTouched={ruleTargetBalanceTouched}
        targetBalanceMissing={targetBalanceMissing}
        targetBalanceShowError={targetBalanceShowError}
        targetBalanceValid={targetBalanceValid}
      />

      <ExchangeRulesList
        isPending={isPending}
        onDelete={handleDeleteRule}
        onEdit={handleEditRule}
        onToggle={handleToggleRule}
        pendingActionId={pendingActionId}
        rules={rules}
      />

      <ExchangeRulesPagination
        onNext={() => applyRulesPage(rulesPage + 1)}
        onPrev={() => applyRulesPage(rulesPage - 1)}
        page={rulesPage}
        totalPages={rulesTotalPages}
      />
    </Panel>
  );
}
