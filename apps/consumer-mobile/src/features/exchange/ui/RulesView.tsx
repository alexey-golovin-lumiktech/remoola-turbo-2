'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { getErrorMessageForUser, getLocalToastMessage, localToastKeys } from '../../../lib/error-messages';
import { showErrorToast } from '../../../lib/toast.client';
import { Button } from '../../../shared/ui/Button';
import { ConfirmationModal } from '../../../shared/ui/ConfirmationModal';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { FormField } from '../../../shared/ui/FormField';
import { FormInput } from '../../../shared/ui/FormInput';
import { FormSelect } from '../../../shared/ui/FormSelect';
import { IconBadge } from '../../../shared/ui/IconBadge';
import { IconButton } from '../../../shared/ui/IconButton';
import { ClipboardListIcon } from '../../../shared/ui/icons/ClipboardListIcon';
import { PauseCircleIcon } from '../../../shared/ui/icons/PauseCircleIcon';
import { PencilIcon } from '../../../shared/ui/icons/PencilIcon';
import { PlayIcon } from '../../../shared/ui/icons/PlayIcon';
import { TrashIcon } from '../../../shared/ui/icons/TrashIcon';
import { Modal } from '../../../shared/ui/Modal';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { StatusBadge } from '../../../shared/ui/StatusBadge';
import { createExchangeRule, updateExchangeRule, deleteExchangeRule } from '../actions';
import styles from './RulesView.module.css';

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

  const [formData, setFormData] = useState({
    name: ``,
    fromCurrency: `USD`,
    toCurrency: `EUR`,
    enabled: true,
  });

  const handleCreate = async () => {
    setIsLoading(true);

    const result = await createExchangeRule(
      formData.name,
      formData.fromCurrency,
      formData.toCurrency,
      formData.enabled,
    );

    if (!result.ok) {
      showErrorToast(getErrorMessageForUser(result.error.code, getLocalToastMessage(localToastKeys.RULE_SAVE_FAILED)), {
        code: result.error.code,
      });
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

    const result = await updateExchangeRule(selectedRule.id, {
      name: formData.name,
      enabled: formData.enabled,
    });

    if (!result.ok) {
      showErrorToast(
        getErrorMessageForUser(result.error.code, getLocalToastMessage(localToastKeys.RULE_UPDATE_FAILED)),
        { code: result.error.code },
      );
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

    const result = await deleteExchangeRule(selectedRule.id);

    if (!result.ok) {
      showErrorToast(
        getErrorMessageForUser(result.error.code, getLocalToastMessage(localToastKeys.RULE_DELETE_FAILED)),
        { code: result.error.code },
      );
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
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (rule: ExchangeRule) => {
    setSelectedRule(rule);
    setIsDeleteModalOpen(true);
  };

  const createRuleAction = (
    <Button
      variant="primary"
      size="md"
      onClick={() => {
        setFormData({ name: ``, fromCurrency: `USD`, toCurrency: `EUR`, enabled: true });
        setIsCreateModalOpen(true);
      }}
    >
      Create rule
    </Button>
  );

  return (
    <div className={styles.root}>
      <PageHeader
        icon={<IconBadge icon={<ClipboardListIcon className={styles.headerIcon} />} hasRing />}
        title="Exchange rules"
        subtitle={rules.length > 0 ? `${rules.length} ${rules.length === 1 ? `rule` : `rules`}` : undefined}
        actions={createRuleAction}
      />
      <div className={styles.main}>
        {rules.length === 0 ? (
          <EmptyState
            title="No exchange rules"
            description="Create automatic exchange rules to convert currencies based on conditions."
            action={{
              label: `Create your first rule`,
              onClick: () => {
                setFormData({ name: ``, fromCurrency: `USD`, toCurrency: `EUR`, enabled: true });
                setIsCreateModalOpen(true);
              },
            }}
          />
        ) : null}

        {rules.length > 0 ? (
          <div className={styles.list}>
            {rules.map((rule) => (
              <div key={rule.id} className={styles.card}>
                <div className={styles.cardRow}>
                  <div className={styles.cardLeft}>
                    <div className={styles.cardTitleRow}>
                      <h3 className={styles.cardTitle}>{rule.name}</h3>
                      <StatusBadge
                        status={rule.enabled ? `Active` : `Inactive`}
                        variant={rule.enabled ? `success` : `default`}
                      />
                    </div>
                    <p className={styles.cardSub}>
                      {rule.fromCurrency} → {rule.toCurrency}
                    </p>
                    <p className={styles.cardMeta}>Created {new Date(rule.createdAt).toLocaleDateString()}</p>
                  </div>

                  <div className={styles.cardActions}>
                    <IconButton
                      onClick={() => handleToggleEnabled(rule)}
                      aria-label={rule.enabled ? `Disable rule` : `Enable rule`}
                    >
                      {rule.enabled ? (
                        <PauseCircleIcon className={styles.iconSize} />
                      ) : (
                        <PlayIcon className={styles.iconSize} />
                      )}
                    </IconButton>
                    <IconButton onClick={() => openEditModal(rule)} aria-label="Edit rule">
                      <PencilIcon className={styles.iconSize} />
                    </IconButton>
                    <IconButton onClick={() => openDeleteModal(rule)} aria-label="Delete rule" variant="danger">
                      <TrashIcon className={styles.iconSize} />
                    </IconButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create exchange rule">
          <div className={styles.formBody}>
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

            <div className={styles.checkboxRow}>
              <input
                type="checkbox"
                id="enabled-create"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className={styles.checkbox}
              />
              <label htmlFor="enabled-create" className={styles.checkboxLabel}>
                Enable rule
              </label>
            </div>

            <div className={styles.formActions}>
              <Button
                variant="outline"
                size="md"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isLoading}
                className={styles.formBtn}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleCreate}
                isLoading={isLoading}
                disabled={!formData.name || !formData.fromCurrency || !formData.toCurrency}
                className={styles.formBtn}
              >
                Create rule
              </Button>
            </div>
          </div>
        </Modal>

        <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit exchange rule">
          <div className={styles.formBody}>
            <FormField label="Rule name" htmlFor="name-edit" required>
              <FormInput
                id="name-edit"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Auto-convert USD to EUR"
                required
              />
            </FormField>

            <div className={styles.checkboxRow}>
              <input
                type="checkbox"
                id="enabled-edit"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className={styles.checkbox}
              />
              <label htmlFor="enabled-edit" className={styles.checkboxLabel}>
                Enable rule
              </label>
            </div>

            <div className={styles.formActions}>
              <Button
                variant="outline"
                size="md"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isLoading}
                className={styles.formBtn}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleEdit}
                isLoading={isLoading}
                disabled={!formData.name}
                className={styles.formBtn}
              >
                Save changes
              </Button>
            </div>
          </div>
        </Modal>

        <ConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDelete}
          title="Delete exchange rule"
          message={`Are you sure you want to delete the rule ${selectedRule?.name ?? ``}? This action cannot be undone.`}
          confirmText="Delete rule"
          cancelText="Cancel"
          variant="danger"
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
