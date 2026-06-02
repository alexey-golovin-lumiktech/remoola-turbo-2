import { type QuickDoc } from './dtos/dashboard-data.dto';

type DashboardQuickDocResource = {
  id: string;
  originalName: string;
  createdAt?: Date | null;
};

type DashboardQuickDocRow = {
  resource: DashboardQuickDocResource;
};

export function mapDashboardQuickDocs(consumerResources: DashboardQuickDocRow[]): QuickDoc[] {
  return consumerResources.map((consumerResource) => ({
    id: consumerResource.resource.id,
    name: consumerResource.resource.originalName,
    createdAt: consumerResource.resource.createdAt?.toISOString() ?? ``,
  }));
}
