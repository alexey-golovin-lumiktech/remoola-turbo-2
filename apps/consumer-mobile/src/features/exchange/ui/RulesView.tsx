'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '../../../shared/ui/Button';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { FormField } from '../../../shared/ui/FormField';
import { FormInput } from '../../../shared/ui/FormInput';
import { FormSelect } from '../../../shared/ui/FormSelect';
import { Modal } from '../../../shared/ui/Modal';
import { StatusBadge } from '../../../shared/ui/StatusBadge';
import { createExchangeRule, updateExchangeRule, deleteExchangeRule } from '../actions';

interface ExchangeRule {
  id: string;
  name: string;
  fromCurrency: string;
  toCurrency: string;
  enabled: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface Currency {
  code: string;
  symbol: string;
  name?: string;
}

interface RulesViewProps {
  rules: ExchangeRule[];
  currencies: Currency[];
}

export function RulesView({ rules, currencies }: RulesViewProps) {
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<ExchangeRule | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: ``,
    fromCurrency: `USD`,
    toCurrency: `EUR`,
    enabled: true,
  });

  const handleCreate = async () => {
    setIsLoading(true);
    setError(null);

    const result = await createExchangeRule(
      formData.name,
      formData.fromCurrency,
      formData.toCurrency,
      formData.enabled,
    );

    if (!result.ok) {
      setError(result.error.message);
      setIsLoading(false);
      return;
    }

    setIsCreateModalOpen(false);
    setFormData({ name: ``, fromCurrency: `USD`, toCurrency: `EUR`, enabled: true });
    setIsLoading(false);
    router.refresh();
  };

  const handleEdit = async () => {
    if (!selectedRule) return;

    setIsLoading(true);
    setError(null);

    const result = await updateExchangeRule(selectedRule.id, {
      name: formData.name,
      enabled: formData.enabled,
    });

    if (!result.ok) {
      setError(result.error.message);
      setIsLoading(false);
      return;
    }

    setIsEditModalOpen(false);
    setSelectedRule(null);
    setIsLoading(false);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!selectedRule) return;

    setIsLoading(true);
    setError(null);

    const result = await deleteExchangeRule(selectedRule.id);

    if (!result.ok) {
      setError(result.error.message);
      setIsLoading(false);
      return;
    }

    setIsDeleteModalOpen(false);
    setSelectedRule(null);
    setIsLoading(false);
    router.refresh();
  };

  const handleToggleEnabled = async (rule: ExchangeRule) => {
    const result = await updateExchangeRule(rule.id, { enabled: !rule.enabled });

    if (result.ok) {
      router.refresh();
    }
  };

  const openEditModal = (rule: ExchangeRule) => {
    setSelectedRule(rule);
    setFormData({
      name: rule.name,
      fromCurrency: rule.fromCurrency,
      toCurrency: rule.toCurrency,
      enabled: rule.enabled,
    });
    setError(null);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (rule: ExchangeRule) => {
    setSelectedRule(rule);
    setError(null);
    setIsDeleteModalOpen(true);
  };

  if (rules.length === 0) {
    return (
      <div
        className={`
  mx-auto
  max-w-md
  space-y-4
  p-4
        `}
      >
        <div className={`flex items-center justify-between`}>
          <h1
            className={`
  text-xl
  font-semibold
  text-slate-800
  dark:text-slate-200
            `}
          >
            Exchange rules
          </h1>
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setFormData({ name: ``, fromCurrency: `USD`, toCurrency: `EUR`, enabled: true });
              setError(null);
              setIsCreateModalOpen(true);
            }}
          >
            Create rule
          </Button>
        </div>

        <EmptyState
          title="No exchange rules"
          description="Create automatic exchange rules to convert currencies based on conditions."
          action={{
            label: `Create your first rule`,
            onClick: () => {
              setFormData({ name: ``, fromCurrency: `USD`, toCurrency: `EUR`, enabled: true });
              setError(null);
              setIsCreateModalOpen(true);
            },
          }}
        />

        <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create exchange rule">
          <div className={`space-y-4`}>
            {error && (
              <div
                className={`
  rounded-lg
  bg-red-50
  p-3
  dark:bg-red-900/20
                `}
              >
                <p className={`text-sm text-red-800 dark:text-red-300`}>{error}</p>
              </div>
            )}

            <FormField label="Rule name" htmlFor="name" required>
              <FormInput
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Auto-convert USD to EUR"
                required
              />
            </FormField>

            <FormField label="From currency" htmlFor="fromCurrency" required>
              <FormSelect
                id="fromCurrency"
                value={formData.fromCurrency}
                onChange={(e) => setFormData({ ...formData, fromCurrency: e.target.value })}
                options={currencies.map((c) => ({ value: c.code, label: `${c.code} - ${c.name ?? c.symbol}` }))}
                required
              />
            </FormField>

            <FormField label="To currency" htmlFor="toCurrency" required>
              <FormSelect
                id="toCurrency"
                value={formData.toCurrency}
                onChange={(e) => setFormData({ ...formData, toCurrency: e.target.value })}
                options={currencies.map((c) => ({ value: c.code, label: `${c.code} - ${c.name ?? c.symbol}` }))}
                required
              />
            </FormField>

            <div className={`flex items-center gap-2`}>
              <input
                type="checkbox"
                id="enabled"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className={`
  h-5
  w-5
  rounded
  border-slate-300
  text-primary-600
  focus:ring-2
  focus:ring-primary-500
                `}
              />
              <label
                htmlFor="enabled"
                className={`
  text-sm
  font-medium
  text-slate-900
  dark:text-white
                `}
              >
                Enable rule
              </label>
            </div>

            <div className={`flex gap-2 pt-2`}>
              <Button
                variant="outline"
                size="md"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isLoading}
                className={`flex-1`}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleCreate}
                isLoading={isLoading}
                disabled={!formData.name || !formData.fromCurrency || !formData.toCurrency}
                className={`flex-1`}
              >
                Create rule
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div
      className={`
  mx-auto
  max-w-md
  space-y-4
  p-4
      `}
    >
      <div className={`flex items-center justify-between`}>
        <h1
          className={`
  text-xl
  font-semibold
  text-slate-800
  dark:text-slate-200
          `}
        >
          Exchange rules
        </h1>
        <Button
          variant="primary"
          size="md"
          onClick={() => {
            setFormData({ name: ``, fromCurrency: `USD`, toCurrency: `EUR`, enabled: true });
            setError(null);
            setIsCreateModalOpen(true);
          }}
        >
          Create rule
        </Button>
      </div>

      <div className={`space-y-3`}>
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={`
  rounded-lg
  border
  border-slate-200
  bg-white
  p-4
  dark:border-slate-700
  dark:bg-slate-800
            `}
          >
            <div className={`flex items-start justify-between`}>
              <div className={`flex-1`}>
                <div className={`flex items-center gap-2`}>
                  <h3
                    className={`
  text-sm
  font-semibold
  text-slate-900
  dark:text-white
                    `}
                  >
                    {rule.name}
                  </h3>
                  <StatusBadge
                    status={rule.enabled ? `Active` : `Inactive`}
                    variant={rule.enabled ? `success` : `default`}
                  />
                </div>
                <p
                  className={`
  mt-1
  text-sm
  text-slate-600
  dark:text-slate-400
                  `}
                >
                  {rule.fromCurrency} → {rule.toCurrency}
                </p>
                <p
                  className={`
  mt-1
  text-xs
  text-slate-500
  dark:text-slate-500
                  `}
                >
                  Created {new Date(rule.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className={`flex gap-1`}>
                <button
                  onClick={() => handleToggleEnabled(rule)}
                  className={`
  min-h-[44px]
  min-w-[44px]
  rounded-lg
  p-2
  text-slate-600
  transition-colors
  hover:bg-slate-100
  focus:outline-none
  focus:ring-2
  focus:ring-primary-500
  dark:text-slate-400
  dark:hover:bg-slate-700
                  `}
                  aria-label={rule.enabled ? `Disable rule` : `Enable rule`}
                >
                  <svg className={`h-5 w-5`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={
                        rule.enabled
                          ? `M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z`
                          : `M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z`
                      }
                    />
                  </svg>
                </button>
                <button
                  onClick={() => openEditModal(rule)}
                  className={`
  min-h-[44px]
  min-w-[44px]
  rounded-lg
  p-2
  text-slate-600
  transition-colors
  hover:bg-slate-100
  focus:outline-none
  focus:ring-2
  focus:ring-primary-500
  dark:text-slate-400
  dark:hover:bg-slate-700
                  `}
                  aria-label="Edit rule"
                >
                  <svg className={`h-5 w-5`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => openDeleteModal(rule)}
                  className={`
  min-h-[44px]
  min-w-[44px]
  rounded-lg
  p-2
  text-red-600
  transition-colors
  hover:bg-red-50
  focus:outline-none
  focus:ring-2
  focus:ring-red-500
  dark:text-red-400
  dark:hover:bg-red-900/20
                  `}
                  aria-label="Delete rule"
                >
                  <svg className={`h-5 w-5`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create exchange rule">
        <div className={`space-y-4`}>
          {error && (
            <div
              className={`
  rounded-lg
  bg-red-50
  p-3
  dark:bg-red-900/20
              `}
            >
              <p className={`text-sm text-red-800 dark:text-red-300`}>{error}</p>
            </div>
          )}

          <FormField label="Rule name" htmlFor="name-create" required>
            <FormInput
              id="name-create"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Auto-convert USD to EUR"
              required
            />
          </FormField>

          <FormField label="From currency" htmlFor="fromCurrency-create" required>
            <FormSelect
              id="fromCurrency-create"
              value={formData.fromCurrency}
              onChange={(e) => setFormData({ ...formData, fromCurrency: e.target.value })}
              options={currencies.map((c) => ({ value: c.code, label: `${c.code} - ${c.name ?? c.symbol}` }))}
              required
            />
          </FormField>

          <FormField label="To currency" htmlFor="toCurrency-create" required>
            <FormSelect
              id="toCurrency-create"
              value={formData.toCurrency}
              onChange={(e) => setFormData({ ...formData, toCurrency: e.target.value })}
              options={currencies.map((c) => ({ value: c.code, label: `${c.code} - ${c.name ?? c.symbol}` }))}
              required
            />
          </FormField>

          <div className={`flex items-center gap-2`}>
            <input
              type="checkbox"
              id="enabled-create"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className={`
  h-5
  w-5
  rounded
  border-slate-300
  text-primary-600
  focus:ring-2
  focus:ring-primary-500
              `}
            />
            <label
              htmlFor="enabled-create"
              className={`
  text-sm
  font-medium
  text-slate-900
  dark:text-white
              `}
            >
              Enable rule
            </label>
          </div>

          <div className={`flex gap-2 pt-2`}>
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isLoading}
              className={`flex-1`}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleCreate}
              isLoading={isLoading}
              disabled={!formData.name || !formData.fromCurrency || !formData.toCurrency}
              className={`flex-1`}
            >
              Create rule
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit exchange rule">
        <div className={`space-y-4`}>
          {error && (
            <div
              className={`
  rounded-lg
  bg-red-50
  p-3
  dark:bg-red-900/20
              `}
            >
              <p className={`text-sm text-red-800 dark:text-red-300`}>{error}</p>
            </div>
          )}

          <FormField label="Rule name" htmlFor="name-edit" required>
            <FormInput
              id="name-edit"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Auto-convert USD to EUR"
              required
            />
          </FormField>

          <div className={`flex items-center gap-2`}>
            <input
              type="checkbox"
              id="enabled-edit"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className={`
  h-5
  w-5
  rounded
  border-slate-300
  text-primary-600
  focus:ring-2
  focus:ring-primary-500
              `}
            />
            <label
              htmlFor="enabled-edit"
              className={`
  text-sm
  font-medium
  text-slate-900
  dark:text-white
              `}
            >
              Enable rule
            </label>
          </div>

          <div className={`flex gap-2 pt-2`}>
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsEditModalOpen(false)}
              disabled={isLoading}
              className={`flex-1`}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleEdit}
              isLoading={isLoading}
              disabled={!formData.name}
              className={`flex-1`}
            >
              Save changes
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete exchange rule">
        <div className={`space-y-4`}>
          {error && (
            <div
              className={`
  rounded-lg
  bg-red-50
  p-3
  dark:bg-red-900/20
              `}
            >
              <p className={`text-sm text-red-800 dark:text-red-300`}>{error}</p>
            </div>
          )}

          <p className={`text-sm text-slate-600 dark:text-slate-400`}>
            Are you sure you want to delete the rule <strong>{selectedRule?.name}</strong>? This action cannot be
            undone.
          </p>

          <div className={`flex gap-2 pt-2`}>
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isLoading}
              className={`flex-1`}
            >
              Cancel
            </Button>
            <Button variant="danger" size="md" onClick={handleDelete} isLoading={isLoading} className={`flex-1`}>
              Delete rule
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
