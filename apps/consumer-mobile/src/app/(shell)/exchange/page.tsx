import { cookies } from 'next/headers';

import { type IConsumerExchangeBalance } from '@remoola/api-types';

import styles from './page.module.css';
import { BalancesPanel } from '../../../features/exchange/ui/BalancesPanel';
import { ExchangeWidget } from '../../../features/exchange/ui/ExchangeWidget';
import { RatesPanel } from '../../../features/exchange/ui/RatesPanel';
import { getCurrencySymbol, normalizeCurrencies, type Currency } from '../../../lib/currency-utils';
import { getEnv } from '../../../lib/env.server';
import { buildServerReadAuthHeaders } from '../../../lib/server-action-auth';
import { CalendarIcon } from '../../../shared/ui/icons/CalendarIcon';
import { ClipboardListIcon } from '../../../shared/ui/icons/ClipboardListIcon';
import { ExchangeIcon } from '../../../shared/ui/icons/ExchangeIcon';
import { SettingsIcon } from '../../../shared/ui/icons/SettingsIcon';
import { NavCard } from '../../../shared/ui/NavCard';

interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: string;
  trend?: `up` | `down` | `stable`;
}

interface ExchangeData {
  currencies?: Currency[];
  balances?: IConsumerExchangeBalance[];
  rates?: ExchangeRate[];
}

type RawExchangeRate = {
  from?: unknown;
  to?: unknown;
  rate?: unknown;
  timestamp?: unknown;
  trend?: unknown;
};

const DEFAULT_RATE_PAIRS = [
  { from: `USD`, to: `EUR` },
  { from: `EUR`, to: `USD` },
  { from: `USD`, to: `GBP` },
  { from: `USD`, to: `JPY` },
] as const;

function isBalanceRecord(x: unknown): x is Record<string, number> {
  if (typeof x !== `object` || x === null || Array.isArray(x)) return false;
  return Object.entries(x).every(([k, v]) => typeof k === `string` && typeof v === `number`);
}

function normalizeBalancesFromApi(data: unknown): IConsumerExchangeBalance[] {
  if (Array.isArray(data)) return data as IConsumerExchangeBalance[];
  if (isBalanceRecord(data)) {
    return Object.entries(data).map(([code, amountCents]) => ({
      currency: code,
      amountCents,
      symbol: getCurrencySymbol(code),
    }));
  }
  const items = (data as { items?: unknown[] })?.items;
  if (Array.isArray(items)) return items as IConsumerExchangeBalance[];
  return [];
}

async function fetchExchangeData(): Promise<ExchangeData> {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    return { currencies: [], balances: [], rates: [] };
  }

  const cookieStore = await cookies();
  const cookie = cookieStore.toString();

  try {
    const [currenciesRes, balancesRes, ratesRes] = await Promise.all([
      fetch(`${baseUrl}/consumer/exchange/currencies`, {
        headers: buildServerReadAuthHeaders(cookie),
        cache: `no-store`,
      }),
      fetch(`${baseUrl}/consumer/payments/balance`, {
        headers: buildServerReadAuthHeaders(cookie),
        cache: `no-store`,
      }),
      fetch(`${baseUrl}/consumer/exchange/rates/batch`, {
        method: `POST`,
        headers: {
          ...buildServerReadAuthHeaders(cookie),
          'content-type': `application/json`,
        },
        cache: `no-store`,
        body: JSON.stringify({ pairs: DEFAULT_RATE_PAIRS }),
      }),
    ]);

    const currencies = currenciesRes.ok ? await currenciesRes.json() : [];
    const balancesRaw = balancesRes.ok ? await balancesRes.json() : [];
    const ratesRaw = ratesRes.ok ? await ratesRes.json() : [];
    const nowIso = new Date().toISOString();
    const ratesSource = Array.isArray(ratesRaw)
      ? ratesRaw
      : Array.isArray(ratesRaw?.items)
        ? ratesRaw.items
        : Array.isArray(ratesRaw?.data)
          ? ratesRaw.data
          : [];
    const rates = ratesSource.map((rate: RawExchangeRate) => ({
      from: String(rate.from),
      to: String(rate.to),
      rate: Number(rate.rate),
      timestamp: typeof rate.timestamp === `string` ? rate.timestamp : nowIso,
      trend: rate.trend === `up` || rate.trend === `down` || rate.trend === `stable` ? rate.trend : undefined,
    }));

    return {
      currencies: normalizeCurrencies(Array.isArray(currencies) ? currencies : (currencies?.items ?? [])),
      balances: normalizeBalancesFromApi(balancesRaw),
      rates: Array.isArray(rates) ? rates : (rates?.items ?? []),
    };
  } catch {
    return {
      currencies: normalizeCurrencies([]),
      balances: [],
      rates: [],
    };
  }
}

export default async function ExchangePage() {
  const data = await fetchExchangeData();

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerRow}>
            <div className={styles.headerIconWrap}>
              <ExchangeIcon className={styles.headerIcon} strokeWidth={2} />
            </div>
            <div>
              <h1 className={styles.title}>Exchange</h1>
              <p className={styles.subtitle}>Convert currency and manage exchange rules</p>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.main}>
        <ExchangeWidget availableCurrencies={data.currencies ?? []} balances={data.balances ?? []} />

        {data.balances && data.balances.length > 0 ? <BalancesPanel balances={data.balances} /> : null}

        {data.rates && data.rates.length > 0 ? <RatesPanel rates={data.rates} /> : null}

        <div className={styles.manageSection}>
          <h2 className={styles.manageTitle}>
            <SettingsIcon className={styles.manageIcon} strokeWidth={2} />
            Manage
          </h2>

          <div className={styles.cardsGrid}>
            <NavCard
              href="/exchange/scheduled"
              icon={<CalendarIcon className={styles.navCardIcon} strokeWidth={2} />}
              title="Scheduled conversions"
              subtitle="View and manage scheduled exchanges"
              alignStart
              className={styles.navCard}
              iconContainerClassName={styles.navCardIconBlue}
            />
            <NavCard
              href="/exchange/rules"
              icon={<ClipboardListIcon className={styles.navCardIcon} strokeWidth={2} />}
              title="Exchange rules"
              subtitle="Set up automatic exchange rules"
              alignStart
              className={styles.navCard}
              iconContainerClassName={styles.navCardIconPurple}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
