'use client';

import { useMemo } from 'react';

import { type IComplianceTask } from '../../types';
import styles from '../ui/classNames.module.css';

const {
  checkboxPrimary,
  complianceBar,
  complianceBarFill,
  complianceEmpty,
  complianceHeader,
  complianceItem,
  complianceLabelDone,
  complianceLabelOpen,
  complianceList,
  complianceProgressText,
  complianceSubtitle,
  complianceTitle,
} = styles;

type ComplianceTasksCardProps = { tasks: IComplianceTask[] };
export function ComplianceTasksCard({ tasks }: ComplianceTasksCardProps) {
  const completedCount = useMemo(() => tasks.filter((t) => t.completed).length, [tasks]);
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <section>
      <header className={complianceHeader}>
        <div>
          <h2 className={complianceTitle}>Tasks – Onboarding / Compliance</h2>
          <p className={complianceSubtitle}>
            {completedCount} of {tasks.length} completed
          </p>
        </div>
        <span className={complianceProgressText}>{progress}% ready</span>
      </header>

      <div className={complianceBar}>
        <div className={complianceBarFill} style={{ width: `${progress}%` }} />
      </div>

      <ul className={complianceList}>
        {tasks.map((task) => (
          <li key={task.id} className={complianceItem}>
            <input type="checkbox" checked={task.completed} readOnly className={checkboxPrimary} />
            <span className={task.completed ? complianceLabelDone : complianceLabelOpen}>{task.label}</span>
          </li>
        ))}

        {tasks.length === 0 && <p className={complianceEmpty}>No tasks at the moment. You’re all set! 🎉</p>}
      </ul>
    </section>
  );
}
