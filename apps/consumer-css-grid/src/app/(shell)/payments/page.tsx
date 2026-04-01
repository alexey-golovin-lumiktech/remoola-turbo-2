import { PaymentsClient } from './PaymentsClient';
import { getPayments, getSettings } from '../../../lib/consumer-api.server';
import { CreditCardIcon } from '../../../shared/ui/icons/CreditCardIcon';
import { PageHeader } from '../../../shared/ui/shell-primitives';

type SearchParams = Record<string, string | string[] | undefined>;

function getSingleValue(value: string | string[] | undefined) {
  return typeof value === `string` ? value : Array.isArray(value) ? (value[0] ?? ``) : ``;
}

function buildCurrentPaymentsPath(searchParams: SearchParams | undefined): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (typeof value === `string`) {
      params.set(key, value);
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }
    }
  }
  const query = params.toString();
  return query ? `/payments?${query}` : `/payments`;
}

export default async function PaymentsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const page = Math.max(1, Number(getSingleValue(resolvedSearchParams?.page)) || 1);
  const pageSize = Math.max(1, Number(getSingleValue(resolvedSearchParams?.pageSize)) || 20);
  const status = getSingleValue(resolvedSearchParams?.status);
  const type = getSingleValue(resolvedSearchParams?.type);
  const role = getSingleValue(resolvedSearchParams?.role);
  const search = getSingleValue(resolvedSearchParams?.search);
  const currentPath = buildCurrentPaymentsPath(resolvedSearchParams);
  const [paymentsResponse, settings] = await Promise.all([
    getPayments(
      {
        page,
        pageSize,
        ...(status ? { status } : {}),
        ...(type ? { type } : {}),
        ...(role ? { role } : {}),
        ...(search ? { search } : {}),
      },
      { redirectTo: currentPath },
    ),
    getSettings({ redirectTo: currentPath }),
  ]);

  return (
    <div>
      <PageHeader title="Payments" icon={<CreditCardIcon className="h-10 w-10 text-white" />} />
      <PaymentsClient
        payments={paymentsResponse?.items ?? []}
        total={paymentsResponse?.total ?? 0}
        page={paymentsResponse?.page ?? page}
        pageSize={paymentsResponse?.pageSize ?? pageSize}
        initialSearch={search}
        initialStatus={status}
        initialType={type}
        initialRole={role}
        preferredCurrency={settings?.preferredCurrency ?? `USD`}
      />
    </div>
  );
}
