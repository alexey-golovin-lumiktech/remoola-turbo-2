'use client';

import { useMemo } from 'react';

import { type IComplianceTask } from '../../types';

type ComplianceTasksCardProps = { tasks: IComplianceTask[] };
export function ComplianceTasksCard({ tasks }: ComplianceTasksCardProps) {
  const completedCount = useMemo(() => tasks.filter((t) => t.completed).length, [tasks]);
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <section>
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Tasks – Onboarding / Compliance</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {completedCount} of {tasks.length} completed
          </p>
        </div>
        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">{progress}% ready</span>
      </header>

      <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <div className="h-full rounded-full bg-blue-500 transition-[width]" style={{ width: `${progress}%` }} />
      </div>

      <ul className="space-y-2">
        {tasks.map((task) => (
          <li key={task.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={task.completed}
              readOnly
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 dark:text-blue-400"
            />
            <span className={task.completed ? `text-slate-400 dark:text-slate-500 line-through` : `text-slate-700 dark:text-slate-300`}>{task.label}</span>
          </li>
        ))}

        {tasks.length === 0 && <p className="text-sm text-slate-400 dark:text-slate-500">No tasks at the moment. You’re all set! 🎉</p>}
      </ul>
    </section>
  );
}
