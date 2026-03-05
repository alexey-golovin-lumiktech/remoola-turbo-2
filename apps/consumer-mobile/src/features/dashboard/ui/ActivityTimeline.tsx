interface ActivityItem {
  id: string;
  label: string;
  description?: string;
  createdAt: string;
  kind: string;
}

interface ActivityTimelineProps {
  activities: ActivityItem[];
  maxItems?: number;
}

const activityIcons = {
  payment: (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
      <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
      <path
        fillRule="evenodd"
        d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"
        clipRule="evenodd"
      />
    </svg>
  ),
  document: (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
        clipRule="evenodd"
      />
    </svg>
  ),
  contact: (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
    </svg>
  ),
  default: (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
        clipRule="evenodd"
      />
    </svg>
  ),
};

/**
 * ActivityTimeline - Timeline view of recent activities
 */
export function ActivityTimeline({ activities, maxItems = 5 }: ActivityTimelineProps) {
  const displayedActivities = activities.slice(0, maxItems);

  if (displayedActivities.length === 0) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Recent activity</h3>
      </div>

      <div className="px-4 py-3">
        <div className="relative space-y-3">
          {displayedActivities.map((activity, index) => {
            const icon = activityIcons[activity.kind as keyof typeof activityIcons] ?? activityIcons.default;
            const isLast = index === displayedActivities.length - 1;

            return (
              <div key={activity.id} className="relative flex gap-3">
                {!isLast && <div className="absolute left-4 top-8 h-full w-px bg-slate-200 dark:bg-slate-700" />}

                <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                  {icon}
                </div>

                <div className="flex-1 pt-0.5">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{activity.label}</p>
                  {activity.description && (
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{activity.description}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                    {new Date(activity.createdAt).toLocaleString(undefined, {
                      month: `short`,
                      day: `numeric`,
                      hour: `2-digit`,
                      minute: `2-digit`,
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
