/**
 * Guard for login form finally block: do not run non-essential state updates (e.g. setLoading(false))
 * after success path has started navigation, to prevent stale-frame UI flashes.
 */
export function shouldFinalizeLoginLoading(didNavigate: boolean): boolean {
  return !didNavigate;
}
