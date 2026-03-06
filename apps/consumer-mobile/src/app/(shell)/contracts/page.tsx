import { headers } from 'next/headers';

import { getContractsList } from '../../../features/contracts/queries';
import { ContractsListView } from '../../../features/contracts/ui/ContractsListView';

export default async function ContractsPage() {
  const headersList = await headers();
  const cookie = headersList.get(`cookie`);
  const response = await getContractsList({ cookie, page: 1, pageSize: 100 });
  return <ContractsListView contracts={response.items} total={response.total} />;
}
