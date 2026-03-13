import styles from './ActivityTimeline.module.css';
import { ClockIcon } from '../../../shared/ui/icons/ClockIcon';
import { CreditCardIcon } from '../../../shared/ui/icons/CreditCardIcon';
import { DocumentIcon } from '../../../shared/ui/icons/DocumentIcon';
import { LightningIcon } from '../../../shared/ui/icons/LightningIcon';
import { UserIcon } from '../../../shared/ui/icons/UserIcon';

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

function getActivityIcon(kind: string, className: string) {
  const iconProps = { className };
  switch (kind) {
    case `payment`:
      return <CreditCardIcon {...iconProps} />;
    case `document`:
      return <DocumentIcon {...iconProps} />;
    case `contact`:
      return <UserIcon {...iconProps} />;
    default:
      return <ClockIcon {...iconProps} />;
  }
}

/**
 * ActivityTimeline - Timeline view of recent activities
 */
export function ActivityTimeline({ activities, maxItems = 5 }: ActivityTimelineProps) {
  const displayedActivities = activities.slice(0, maxItems);

  if (displayedActivities.length === 0) {
    return null;
  }

  return (
    <div className={styles.card} style={{ animationDelay: `150ms` }}>
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <LightningIcon className={styles.headerIcon} strokeWidth={2} />
          <h3 className={styles.headerTitle}>Recent activity</h3>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.list}>
          {displayedActivities.map((activity, index) => {
            const icon = getActivityIcon(activity.kind, styles.icon ?? ``);
            const isLast = index === displayedActivities.length - 1;

            return (
              <div key={activity.id} className={styles.row} style={{ animationDelay: `${150 + index * 50}ms` }}>
                {!isLast ? <div className={styles.line} /> : null}

                <div className={styles.iconWrap}>{icon}</div>

                <div className={styles.body}>
                  <p className={styles.label}>{activity.label}</p>
                  {activity.description ? <p className={styles.description}>{activity.description}</p> : null}
                  <div className={styles.metaRow}>
                    <ClockIcon className={styles.metaIcon} />
                    <p className={styles.metaText}>
                      {new Date(activity.createdAt).toLocaleString(undefined, {
                        month: `short`,
                        day: `numeric`,
                        hour: `2-digit`,
                        minute: `2-digit`,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
