import { headers } from 'next/headers';

import { getDashboardData } from '../../../features/dashboard/queries';
import { DashboardView } from '../../../features/dashboard/ui/DashboardView';

export default async function DashboardPage() {
  const headersList = await headers();
  const cookie = headersList.get(`cookie`);
  const data = await getDashboardData(cookie);
  return <DashboardView data={data} />;
}
