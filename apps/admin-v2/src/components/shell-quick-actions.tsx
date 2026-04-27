import { type ReactElement } from 'react';

import { cn } from '@remoola/ui';

import { ActionGhost } from './action-ghost';
import { ActionPrimary } from './action-primary';
import { NavIcon } from './nav-icon';
import { actionGroupClass, actionGroupLabelClass } from './ui-classes';

type ShellQuickActionsProps = {
  compact?: boolean;
};

export function ShellQuickActions({ compact = false }: ShellQuickActionsProps): ReactElement {
  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        <ActionGhost href="/audit" className="flex-1 sm:flex-none">
          <NavIcon name="eye" />
          <span>Audit trail</span>
        </ActionGhost>
        <ActionGhost href="/payments/operations" className="flex-1 sm:flex-none">
          <NavIcon name="flag" />
          <span>Review queue</span>
        </ActionGhost>
        <ActionPrimary href="/me/sessions" ariaDisabled title="Coming soon" className="w-full sm:w-auto">
          <NavIcon name="plus" />
          <span>Open case</span>
        </ActionPrimary>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className={actionGroupClass}>
        <span className={actionGroupLabelClass}>Investigate</span>
        <ActionGhost href="/audit">
          <NavIcon name="eye" />
          <span>Audit trail</span>
        </ActionGhost>
        <ActionGhost href="/payments/operations">
          <NavIcon name="flag" />
          <span>Review queue</span>
        </ActionGhost>
      </div>
      <div className={cn(actionGroupClass, `min-w-0`)}>
        <span className={actionGroupLabelClass}>Workflow</span>
        <ActionPrimary href="/me/sessions" ariaDisabled title="Coming soon">
          <NavIcon name="plus" />
          <span>Open case</span>
        </ActionPrimary>
      </div>
    </div>
  );
}
