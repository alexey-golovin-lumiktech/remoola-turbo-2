'use client';

import { type IActivityItem } from '../../types';
import {
  activityDate,
  activityDescription,
  activityDot,
  activityEmpty,
  activityHeader,
  activityLabel,
  activityList,
  activityRow,
  activityRowBody,
  activityRowHeader,
  activityTitle,
} from '../ui/classNames';

type ActivityTimelineProps = { activityTimelineItems: IActivityItem[] };

export function ActivityTimeline({ activityTimelineItems }: ActivityTimelineProps) {
  return (
    <section>
      <header className={activityHeader}>
        <h2 className={activityTitle}>Activity Timeline</h2>
      </header>

      <div className={activityList}>
        {activityTimelineItems.length === 0 && (
          <p className={activityEmpty}>
            No recent activity. Once you create payment requests and complete compliance, events will show up here.
          </p>
        )}

        {activityTimelineItems.map((activityTimelineItem) => (
          <div key={activityTimelineItem.id} className={activityRow}>
            <div className={activityDot} />
            <div className={activityRowBody}>
              <div className={activityRowHeader}>
                <p className={activityLabel}>{activityTimelineItem.label}</p>
                <span className={activityDate}>
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: `short`,
                    timeStyle: `short`,
                  }).format(new Date(activityTimelineItem.createdAt))}
                </span>
              </div>
              {activityTimelineItem.description && (
                <p className={activityDescription}>{activityTimelineItem.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
