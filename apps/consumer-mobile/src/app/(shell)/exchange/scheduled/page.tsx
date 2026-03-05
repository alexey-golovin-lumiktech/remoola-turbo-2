import { cookies } from 'next/headers';

import { ScheduledConversionsView } from '../../../../features/exchange/ui/ScheduledConversionsView';
import { getEnv } from '../../../../lib/env.server';

interface ScheduledConversion {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  scheduledAt: string;
  status: string;
  createdAt: string;
}

async function fetchScheduledConversions(): Promise<ScheduledConversion[]> {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  const cookieStore = await cookies();
  const cookie = cookieStore.toString();

  if (!baseUrl) {
    return [];
  }

  try {
    const res = await fetch(`${baseUrl}/consumer/exchange/scheduled`, {
      headers: { Cookie: cookie },
      cache: `no-store`,
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return Array.isArray(data) ? data : (data?.items ?? []);
  } catch {
    return [];
  }
}

export default async function ExchangeScheduledPage() {
  const conversions = await fetchScheduledConversions();

  return <ScheduledConversionsView conversions={conversions} />;
}
