import { headers } from 'next/headers';

import { getDashboardData, DashboardView } from '../../../features/dashboard';

export default async function DashboardPage() {
  const headersList = await headers();
  const cookie = headersList.get(`cookie`);
  const data = await getDashboardData(cookie);
  return <DashboardView data={data} />;
}
