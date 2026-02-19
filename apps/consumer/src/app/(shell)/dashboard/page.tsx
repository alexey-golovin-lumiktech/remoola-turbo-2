import { type Metadata } from 'next';

import { DashboardDataView } from '../../../components';

export const metadata: Metadata = {
  title: `Client Dashboard - Remoola`,
};

export default async function DashboardPage() {
  return <DashboardDataView />;
}
