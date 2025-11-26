'use client';

import { type ActivityItem } from '../../lib/dashboard-api';

export function ActivityTimeline({ items }: { items: ActivityItem[] }) {
  return (
    <section>
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Activity Timeline</h2>
      </header>

      <div className="space-y-3">
        {items.length === 0 && (
          <p className="text-sm text-slate-400">
            No recent activity. Once you create payment requests and complete compliance, events will show up here.
          </p>
        )}

        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-3">
            <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-900">{item.label}</p>
                <span className="text-xs text-slate-400">
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: `short`,
                    timeStyle: `short`,
                  }).format(new Date(item.createdAt))}
                </span>
              </div>
              {item.description && <p className="text-xs text-slate-500">{item.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
