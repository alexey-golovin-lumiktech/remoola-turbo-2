import { headers } from 'next/headers';

import { getContractsList, ContractsListView } from '../../../features/contracts';

export default async function ContractsPage() {
  const headersList = await headers();
  const cookie = headersList.get(`cookie`);
  const response = await getContractsList({ cookie, page: 1, pageSize: 100 });
  return <ContractsListView contracts={response.items} total={response.total} />;
}
