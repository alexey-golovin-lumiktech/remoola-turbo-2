'use server';

export async function dashboardNoopAction(): Promise<{ ok: true }> {
  return { ok: true };
}
