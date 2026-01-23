'use client';

import { type IActivityItem } from '../../types';

type ActivityTimelineProps = { activityTimelineItems: IActivityItem[] };

export function ActivityTimeline({ activityTimelineItems }: ActivityTimelineProps) {
  return (
    <section>
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Activity Timeline</h2>
      </header>

      <div className="space-y-3">
        {activityTimelineItems.length === 0 && (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            No recent activity. Once you create payment requests and complete compliance, events will show up here.
          </p>
        )}

        {activityTimelineItems.map((activityTimelineItem) => (
          <div key={activityTimelineItem.id} className="flex items-start gap-3">
            <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{activityTimelineItem.label}</p>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: `short`,
                    timeStyle: `short`,
                  }).format(new Date(activityTimelineItem.createdAt))}
                </span>
              </div>
              {activityTimelineItem.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400">{activityTimelineItem.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
