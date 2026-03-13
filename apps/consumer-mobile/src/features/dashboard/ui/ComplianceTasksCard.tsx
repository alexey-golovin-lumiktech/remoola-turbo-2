import styles from './ComplianceTasksCard.module.css';
import { CheckIcon } from '../../../shared/ui/icons/CheckIcon';

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
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <h3 className={styles.headerTitle}>Compliance tasks</h3>
          <span className={styles.headerMeta}>
            {completedCount} of {tasks.length} complete
          </span>
        </div>

        <div className={styles.progressTrack}>
          <div className={styles.progressBar} style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className={styles.list}>
        {incompleteTasks.map((task) => (
          <div key={task.id} className={styles.taskRow}>
            <div className={styles.taskContent}>
              <div className={styles.checkbox}>
                <CheckIcon className={styles.checkboxIcon} />
              </div>
              <p className={styles.taskLabel}>{task.label}</p>
              <button className={styles.completeBtn} type="button" aria-label="Complete task">
                Complete
              </button>
            </div>
          </div>
        ))}

        {incompleteTasks.length === 0 ? (
          <div className={styles.emptyWrap}>
            <div className={styles.emptyIconWrap}>
              <CheckIcon className={styles.emptyIcon} />
            </div>
            <p className={styles.emptyTitle}>All tasks complete!</p>
            <p className={styles.emptySub}>You&apos;re fully compliant</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
