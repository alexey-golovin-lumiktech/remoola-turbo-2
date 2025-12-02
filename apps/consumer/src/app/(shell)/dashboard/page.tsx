import { DashboardDataView } from '../../../components';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: `Client Dashboard - Remoola`,
};

export default async function DashboardPage() {
  return <DashboardDataView />;
}
