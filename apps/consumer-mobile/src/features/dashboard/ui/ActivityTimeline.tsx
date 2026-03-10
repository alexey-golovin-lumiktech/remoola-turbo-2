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

const activityIcons = {
  payment: <CreditCardIcon className={`h-4 w-4`} />,
  document: <DocumentIcon className={`h-4 w-4`} />,
  contact: <UserIcon className={`h-4 w-4`} />,
  default: <ClockIcon className={`h-4 w-4`} />,
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
    <div
      className={`
        overflow-hidden
        rounded-2xl
        border
        border-slate-700
        bg-slate-800/90
        shadow-lg
        animate-fadeIn
      `}
      style={{ animationDelay: `150ms` }}
    >
      <div
        className={`
        border-b
        border-slate-700
        bg-linear-to-r
        from-slate-800
        to-slate-900
        px-5
        py-4
      `}
      >
        <div className={`flex items-center gap-2`}>
          <LightningIcon className={`h-5 w-5 text-primary-400`} strokeWidth={2} />
          <h3 className={`text-base font-bold text-slate-100`}>Recent activity</h3>
        </div>
      </div>

      <div className={`px-5 py-4`}>
        <div className={`relative space-y-4`}>
          {displayedActivities.map((activity, index) => {
            const icon = activityIcons[activity.kind as keyof typeof activityIcons] ?? activityIcons.default;
            const isLast = index === displayedActivities.length - 1;

            return (
              <div
                key={activity.id}
                className={`
                  relative
                  flex
                  gap-4
                  animate-fadeIn
                `}
                style={{ animationDelay: `${150 + index * 50}ms` }}
              >
                {!isLast && (
                  <div
                    className={`
                  absolute
                  left-5
                  top-10
                  h-full
                  w-px
                  bg-slate-700
                `}
                  />
                )}

                <div
                  className={`
                  relative
                  z-10
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-linear-to-br
                  from-primary-500
                  to-primary-600
                  text-white
                  shadow-md
                `}
                >
                  {icon}
                </div>

                <div className={`flex-1 pt-1`}>
                  <p className={`text-sm font-bold text-slate-100`}>{activity.label}</p>
                  {activity.description && (
                    <p
                      className={`
                      mt-1
                      text-sm
                      font-medium
                      text-slate-400
                    `}
                    >
                      {activity.description}
                    </p>
                  )}
                  <div
                    className={`
                    mt-2
                    flex
                    items-center
                    gap-1.5
                  `}
                  >
                    <ClockIcon className={`h-3.5 w-3.5 text-slate-500`} />
                    <p className={`text-xs font-medium text-slate-500`}>
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
