/**
 * Derives whether the consumer profile is complete from dashboard tasks.
 * Used to show "Complete your profile" vs "Verify Me" on the dashboard.
 * Task id `profile` comes from API (ConsumerDashboardService.buildTasks).
 */
export interface DashboardTask {
  id: string;
  label: string;
  completed: boolean;
}

export function isProfileCompleteFromTasks(tasks: DashboardTask[]): boolean {
  const profileTask = tasks.find((t) => t.id === `profile`);
  return profileTask?.completed === true;
}
