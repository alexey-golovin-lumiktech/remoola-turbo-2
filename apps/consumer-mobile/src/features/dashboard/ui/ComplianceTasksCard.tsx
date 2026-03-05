interface ComplianceTask {
  id: string;
  label: string;
  completed: boolean;
}

interface ComplianceTasksCardProps {
  tasks: ComplianceTask[];
}

/**
 * ComplianceTasksCard - Display compliance tasks that need attention
 */
export function ComplianceTasksCard({ tasks }: ComplianceTasksCardProps) {
  if (tasks.length === 0) {
    return null;
  }

  const incompleteTasks = tasks.filter((task) => !task.completed);
  const completedCount = tasks.length - incompleteTasks.length;
  const progressPercent = (completedCount / tasks.length) * 100;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Compliance tasks</h3>
          <span className="text-xs text-slate-600 dark:text-slate-400">
            {completedCount} of {tasks.length} complete
          </span>
        </div>

        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-primary-600 transition-all duration-500 dark:bg-primary-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {incompleteTasks.map((task) => (
          <div key={task.id} className="px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-slate-300 dark:border-slate-600">
                <svg className="h-3 w-3 text-transparent" fill="currentColor" viewBox="0 0 12 12">
                  <path d="M3.707 5.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4a1 1 0 00-1.414-1.414L5 6.586 3.707 5.293z" />
                </svg>
              </div>
              <p className="flex-1 text-sm text-slate-900 dark:text-white">{task.label}</p>
              <button
                className="rounded px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20"
                aria-label="Complete task"
              >
                Complete
              </button>
            </div>
          </div>
        ))}

        {incompleteTasks.length === 0 && (
          <div className="px-4 py-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">All tasks complete!</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">You&apos;re fully compliant</p>
          </div>
        )}
      </div>
    </div>
  );
}
