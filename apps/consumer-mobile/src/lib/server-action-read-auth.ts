import { getServerActionReadAuthHeaders } from './server-action-auth';

export async function getServerActionQueryAuthHeaders(): Promise<Record<string, string>> {
  return getServerActionReadAuthHeaders();
}
