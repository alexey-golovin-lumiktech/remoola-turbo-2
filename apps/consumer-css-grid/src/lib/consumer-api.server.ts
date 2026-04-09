import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import {
  CONSUMER_APP_SCOPE_HEADER,
  SESSION_EXPIRED_QUERY,
  sanitizeNextForRedirect,
  type TTheme,
} from '@remoola/api-types';

import { buildConsumerMutationHeaders } from './consumer-auth-headers.server';
import { normalizeDocumentDownloadUrl } from './document-download-url';
import { getEnv } from './env.server';
import { APP_SCOPE, getRequestOrigin } from './request-origin';

export interface DashboardData {
  summary: {
    balanceCents: number;
    balanceCurrencyCode?: string | null;
    availableBalanceCents: number;
    availableBalanceCurrencyCode?: string | null;
    activeRequests: number;
    lastPaymentAt: string | null;
  };
  pendingRequests: Array<{
    id: string;
    counterpartyName: string;
    amount: number;
    currencyCode: string;
    status: string;
    lastActivityAt: string | null;
  }>;
  activity: Array<{
    id: string;
    label: string;
    description?: string;
    createdAt: string;
    kind: string;
  }>;
  tasks: Array<{
    id: string;
    label: string;
    completed: boolean;
  }>;
  quickDocs: Array<{
    id: string;
    name: string;
    createdAt: string;
  }>;
  pendingWithdrawals?: {
    items: Array<{
      id: string;
      ledgerId: string;
      paymentRequestId: string | null;
      amount: number;
      currencyCode: string;
      status: string;
      createdAt: string;
      paymentMethodLabel: string | null;
    }>;
    total: number;
  };
  verification: {
    effectiveVerified: boolean;
    profileComplete: boolean;
    status: string;
    canStart: boolean;
    legalVerified: boolean;
    reviewStatus: string;
    stripeStatus: string;
    sessionId: string | null;
    lastErrorCode: string | null;
    lastErrorReason: string | null;
    startedAt: string | null;
    updatedAt: string | null;
    verifiedAt: string | null;
  };
}

export interface DashboardDataResult {
  data: DashboardData | null;
  unavailable: boolean;
}

export interface PaymentsResponse {
  items: Array<{
    id: string;
    amount: number;
    currencyCode: string;
    status: string;
    role: string;
    type?: string | null;
    description?: string | null;
    createdAt: string;
    latestTransaction?: {
      id: string;
      status: string;
      createdAt: string;
    };
    counterparty: {
      id: string;
      email: string;
    };
  }>;
  total: number;
  page?: number;
  pageSize?: number;
}

export interface PaymentViewResponse {
  id: string;
  amount: number;
  currencyCode: string;
  status: string;
  description?: string | null;
  dueDate?: string | null;
  sentDate?: string | null;
  createdAt: string;
  updatedAt: string;
  role: string;
  payer: {
    id?: string | null;
    email?: string | null;
  } | null;
  requester: {
    id?: string | null;
    email?: string | null;
  } | null;
  ledgerEntries: Array<{
    id: string;
    ledgerId: string;
    currencyCode: string;
    amount: number;
    direction: string;
    status: string;
    type: string;
    createdAt: string;
    rail?: string | null;
    counterpartyId?: string | null;
  }>;
  attachments: Array<{
    id: string;
    name: string;
    downloadUrl: string;
    size: number;
    createdAt: string;
  }>;
}

export interface ContractsResponse {
  items: Array<{
    id: string;
    name: string;
    email: string;
    lastRequestId: string | null;
    lastStatus: string | null;
    lastActivity: string | null;
    docs: number;
  }>;
  total: number;
  page?: number;
  pageSize?: number;
}

export interface ProfileResponse {
  id: string;
  accountType: string;
  hasPassword?: boolean;
  personalDetails?: {
    firstName?: string | null;
    lastName?: string | null;
    citizenOf?: string | null;
    taxId?: string | null;
    phoneNumber?: string | null;
  } | null;
  addressDetails?: {
    country?: string | null;
    city?: string | null;
    street?: string | null;
    postalCode?: string | null;
  } | null;
  organizationDetails?: {
    name?: string | null;
    size?: string | null;
    consumerRole?: string | null;
  } | null;
  verification?: {
    effectiveVerified: boolean;
    profileComplete: boolean;
    status: string;
    canStart: boolean;
    legalVerified: boolean;
    reviewStatus: string;
    stripeStatus: string;
    sessionId: string | null;
    lastErrorCode: string | null;
    lastErrorReason: string | null;
    startedAt: string | null;
    updatedAt: string | null;
    verifiedAt: string | null;
  };
}

export interface SettingsResponse {
  theme?: TTheme | null;
  preferredCurrency?: string | null;
}

export interface DocumentsResponse {
  items: Array<{
    id: string;
    name: string;
    size: number;
    createdAt: string;
    downloadUrl: string;
    mimetype: string | null;
    kind: string;
    tags: string[];
    isAttachedToDraftPaymentRequest: boolean;
    attachedDraftPaymentRequestIds: string[];
    isAttachedToNonDraftPaymentRequest: boolean;
    attachedNonDraftPaymentRequestIds: string[];
  }>;
  total: number;
  page?: number;
  pageSize?: number;
}

export interface ContactsResponse {
  items: Array<{
    id: string;
    name?: string | null;
    email?: string | null;
    address?: {
      street?: string | null;
      city?: string | null;
      state?: string | null;
      postalCode?: string | null;
      country?: string | null;
    } | null;
  }>;
  total: number;
  page?: number;
  pageSize?: number;
}

export interface ContactResponse {
  id: string;
  name?: string | null;
  email?: string | null;
  address?: {
    street?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
  } | null;
}

export interface ContactSearchItem {
  id: string;
  name?: string | null;
  email?: string | null;
}

export interface ContactDetailsResponse extends ContactResponse {
  paymentRequests: Array<{
    id: string;
    amount: string;
    status: string;
    createdAt: string;
  }>;
  documents: Array<{
    id: string;
    name: string;
    url: string;
    createdAt: string;
  }>;
}

export interface PaymentMethodsResponse {
  items: Array<{
    id: string;
    type: string;
    brand: string;
    last4: string;
    expMonth: string | null;
    expYear: string | null;
    defaultSelected: boolean;
    reusableForPayerPayments: boolean;
    billingDetails: {
      id: string;
      email: string | null;
      name: string | null;
      phone: string | null;
    } | null;
  }>;
}

export type BalanceResponse = Record<string, number>;

export interface PaymentHistoryResponse {
  items: Array<{
    id: string;
    ledgerId: string;
    type: string;
    status: string;
    currencyCode: string;
    amount: number;
    direction: string;
    createdAt: string;
    rail: string | null;
    paymentMethodId: string | null;
    paymentMethodLabel: string | null;
    paymentRequestId: string | null;
  }>;
  total: number;
  limit?: number;
  offset?: number;
}

export interface ExchangeCurrency {
  code: string;
  symbol: string;
  name?: string;
}

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
}

export interface ExchangeRateCard {
  from: string;
  to: string;
  rate: number | null;
  status: `available` | `stale` | `unavailable`;
}

export interface ExchangeRatesBatchResult {
  items: ExchangeRateCard[];
  unavailable: boolean;
}

interface ConsumerApiRequestOptions {
  redirectTo?: string;
}

interface ExchangeRateBatchItem {
  from?: string;
  to?: string;
  rate?: number;
  code?: string;
}

export interface ExchangeRule {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  targetBalance: number;
  maxConvertAmount: number | null;
  minIntervalMinutes: number;
  enabled: boolean;
}

export interface ScheduledConversion {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  executeAt: string;
  status: string;
}

// Balance endpoints return major units; UI balance state stays in minor units.
function majorBalanceToMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

function normalizeBalanceResponse(raw: BalanceResponse): BalanceResponse {
  return Object.fromEntries(
    Object.entries(raw).map(([currency, amount]) => [currency, majorBalanceToMinorUnits(Number(amount))]),
  ) as BalanceResponse;
}

function buildSessionExpiredLoginUrl(redirectTo: string): string {
  const safeNext = encodeURIComponent(sanitizeNextForRedirect(redirectTo, `/dashboard`));
  return `/login?${SESSION_EXPIRED_QUERY}=1&next=${safeNext}`;
}

function redirectOnUnauthorized(options?: ConsumerApiRequestOptions): void {
  if (!options?.redirectTo) return;
  redirect(buildSessionExpiredLoginUrl(options.redirectTo));
}

function isRedirectControlFlow(error: unknown): boolean {
  if (typeof error !== `object` || error === null) {
    return false;
  }
  const digest = `digest` in error ? error.digest : undefined;
  if (typeof digest === `string` && digest.startsWith(`NEXT_REDIRECT`)) {
    return true;
  }
  const message = `message` in error ? error.message : undefined;
  return typeof message === `string` && message.startsWith(`NEXT_REDIRECT`);
}

async function fetchConsumerApi<T>(path: string, options?: ConsumerApiRequestOptions): Promise<T | null> {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) return null;

  try {
    const cookieStore = await cookies();
    const response = await fetch(`${baseUrl}${path}`, {
      method: `GET`,
      headers: {
        Cookie: cookieStore.toString(),
        origin: getRequestOrigin(),
        [CONSUMER_APP_SCOPE_HEADER]: APP_SCOPE,
      },
      cache: `no-store`,
      signal: AbortSignal.timeout(15000),
    });

    if (response.status === 401) {
      redirectOnUnauthorized(options);
      return null;
    }
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch (error) {
    if (isRedirectControlFlow(error)) throw error;
    return null;
  }
}

async function postConsumerApi<T>(path: string, body: unknown, options?: ConsumerApiRequestOptions): Promise<T | null> {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) return null;

  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();
    const response = await fetch(`${baseUrl}${path}`, {
      method: `POST`,
      headers: buildConsumerMutationHeaders(cookieHeader, {
        'content-type': `application/json`,
      }),
      body: JSON.stringify(body),
      cache: `no-store`,
      signal: AbortSignal.timeout(15000),
    });

    if (response.status === 401) {
      redirectOnUnauthorized(options);
      return null;
    }
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch (error) {
    if (isRedirectControlFlow(error)) throw error;
    return null;
  }
}

async function fetchConsumerApiResult<T>(
  path: string,
  options?: ConsumerApiRequestOptions,
): Promise<{ data: T | null; unavailable: boolean }> {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return { data: null, unavailable: true };
  }

  try {
    const cookieStore = await cookies();
    const response = await fetch(`${baseUrl}${path}`, {
      method: `GET`,
      headers: {
        Cookie: cookieStore.toString(),
        origin: getRequestOrigin(),
        [CONSUMER_APP_SCOPE_HEADER]: APP_SCOPE,
      },
      cache: `no-store`,
      signal: AbortSignal.timeout(15000),
    });

    if (response.status === 401) {
      redirectOnUnauthorized(options);
      return { data: null, unavailable: false };
    }
    if (!response.ok) {
      return { data: null, unavailable: true };
    }

    return {
      data: (await response.json()) as T,
      unavailable: false,
    };
  } catch (error) {
    if (isRedirectControlFlow(error)) throw error;
    return { data: null, unavailable: true };
  }
}

function normalizePendingWithdrawals(
  raw: PaymentHistoryResponse | null,
): NonNullable<DashboardData[`pendingWithdrawals`]> {
  if (!raw) {
    return { items: [], total: 0 };
  }

  return {
    items: raw.items
      .filter((item) => item.type === `USER_PAYOUT`)
      .map((item) => ({
        id: item.id,
        ledgerId: item.ledgerId,
        paymentRequestId: item.paymentRequestId,
        amount: Math.abs(item.amount),
        currencyCode: item.currencyCode,
        status: item.status,
        createdAt: item.createdAt,
        paymentMethodLabel: item.paymentMethodLabel,
      })),
    total: raw.total,
  };
}

async function getPendingWithdrawals(options?: ConsumerApiRequestOptions): Promise<PaymentHistoryResponse | null> {
  const searchParams = new URLSearchParams({
    direction: `OUTCOME`,
    status: `PENDING`,
    type: `USER_PAYOUT`,
    limit: `5`,
  });
  return fetchConsumerApi<PaymentHistoryResponse>(`/consumer/payments/history?${searchParams.toString()}`, options);
}

export async function getDashboardData(options?: ConsumerApiRequestOptions): Promise<DashboardDataResult> {
  const [dashboardResult, pendingWithdrawals] = await Promise.all([
    fetchConsumerApiResult<DashboardData>(`/consumer/dashboard`, options),
    getPendingWithdrawals(options),
  ]);

  if (!dashboardResult.data) {
    return dashboardResult;
  }

  return {
    ...dashboardResult,
    data: {
      ...dashboardResult.data,
      pendingWithdrawals: normalizePendingWithdrawals(pendingWithdrawals),
    },
  };
}

export async function getPayments(
  params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    type?: string;
    role?: string;
    search?: string;
  },
  options?: ConsumerApiRequestOptions,
): Promise<PaymentsResponse | null> {
  const searchParams = new URLSearchParams({
    page: String(params?.page ?? 1),
    pageSize: String(params?.pageSize ?? 20),
  });
  if (params?.status) searchParams.set(`status`, params.status);
  if (params?.type) searchParams.set(`type`, params.type);
  if (params?.role) searchParams.set(`role`, params.role);
  if (params?.search) searchParams.set(`search`, params.search);
  return fetchConsumerApi<PaymentsResponse>(`/consumer/payments?${searchParams.toString()}`, options);
}

export async function getPaymentView(
  paymentRequestId: string,
  options?: ConsumerApiRequestOptions,
): Promise<PaymentViewResponse | null> {
  if (!paymentRequestId.trim()) return null;
  const payment = await fetchConsumerApi<PaymentViewResponse>(`/consumer/payments/${paymentRequestId}`, options);
  if (!payment) return null;

  return {
    ...payment,
    attachments: payment.attachments.map((attachment) => ({
      ...attachment,
      downloadUrl: normalizeDocumentDownloadUrl(attachment.downloadUrl, attachment.id),
    })),
  };
}

export async function getContracts(page = 1, pageSize = 10): Promise<ContractsResponse | null> {
  return fetchConsumerApi<ContractsResponse>(`/consumer/contracts?page=${page}&pageSize=${pageSize}`);
}

export async function getProfile(options?: ConsumerApiRequestOptions): Promise<ProfileResponse | null> {
  return fetchConsumerApi<ProfileResponse>(`/consumer/profile/me`, options);
}

export async function getSettings(options?: ConsumerApiRequestOptions): Promise<SettingsResponse | null> {
  return fetchConsumerApi<SettingsResponse>(`/consumer/settings`, options);
}

export async function getDocuments(
  page = 1,
  pageSize = 20,
  options?: ConsumerApiRequestOptions,
): Promise<DocumentsResponse | null> {
  const documents = await fetchConsumerApi<DocumentsResponse>(
    `/consumer/documents?page=${page}&pageSize=${pageSize}`,
    options,
  );
  if (!documents) return null;

  return {
    ...documents,
    items: documents.items.map((document) => ({
      ...document,
      downloadUrl: normalizeDocumentDownloadUrl(document.downloadUrl, document.id),
    })),
  };
}

export async function getContacts(page = 1, pageSize = 20): Promise<ContactsResponse | null> {
  return fetchConsumerApi<ContactsResponse>(`/consumer/contacts?page=${page}&pageSize=${pageSize}`);
}

export async function searchContacts(query: string, limit = 20): Promise<ContactSearchItem[] | null> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];
  const safeLimit = Math.min(20, Math.max(1, Math.floor(limit) || 20));
  return fetchConsumerApi<ContactSearchItem[]>(
    `/consumer/contacts?query=${encodeURIComponent(trimmedQuery)}&limit=${safeLimit}`,
  );
}

export async function findContactByExactEmail(email: string): Promise<ContactSearchItem | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;
  return fetchConsumerApi<ContactSearchItem | null>(
    `/consumer/contacts/lookup/by-email?email=${encodeURIComponent(normalizedEmail)}`,
  );
}

export async function getContact(contactId: string): Promise<ContactResponse | null> {
  const id = contactId.trim();
  if (!id) return null;
  return fetchConsumerApi<ContactResponse>(`/consumer/contacts/${id}`);
}

export async function getContactDetails(contactId: string): Promise<ContactDetailsResponse | null> {
  const id = contactId.trim();
  if (!id) return null;
  const contact = await fetchConsumerApi<ContactDetailsResponse>(`/consumer/contacts/${id}/details`);
  if (!contact) return null;

  return {
    ...contact,
    documents: contact.documents.map((document) => ({
      ...document,
      url: normalizeDocumentDownloadUrl(document.url, document.id),
    })),
  };
}

export async function getPaymentMethods(options?: ConsumerApiRequestOptions): Promise<PaymentMethodsResponse | null> {
  return fetchConsumerApi<PaymentMethodsResponse>(`/consumer/payment-methods`, options);
}

export async function getBalances(options?: ConsumerApiRequestOptions): Promise<BalanceResponse | null> {
  const raw = await fetchConsumerApi<BalanceResponse>(`/consumer/payments/balance`, options);
  if (!raw) return null;
  return normalizeBalanceResponse(raw);
}

export async function getAvailableBalances(options?: ConsumerApiRequestOptions): Promise<BalanceResponse | null> {
  const raw = await fetchConsumerApi<BalanceResponse>(`/consumer/payments/balance/available`, options);
  if (!raw) return null;
  return normalizeBalanceResponse(raw);
}

export async function getPaymentHistory(
  params?: {
    limit?: number;
    offset?: number;
    direction?: string;
    status?: string;
    type?: string;
  },
  options?: ConsumerApiRequestOptions,
): Promise<PaymentHistoryResponse | null> {
  const searchParams = new URLSearchParams({
    limit: String(params?.limit ?? 20),
    offset: String(params?.offset ?? 0),
  });
  if (params?.direction) searchParams.set(`direction`, params.direction);
  if (params?.status) searchParams.set(`status`, params.status);
  if (params?.type) searchParams.set(`type`, params.type);
  return fetchConsumerApi<PaymentHistoryResponse>(`/consumer/payments/history?${searchParams.toString()}`, options);
}

export async function getExchangeCurrencies(options?: ConsumerApiRequestOptions): Promise<ExchangeCurrency[] | null> {
  const raw = await fetchConsumerApi<unknown>(`/consumer/exchange/currencies`, options);
  if (!Array.isArray(raw)) return null;
  return raw.map((code) => {
    const currencyCode = String(code);
    return {
      code: currencyCode,
      symbol: currencyCode.slice(0, 1),
    };
  });
}

export async function getExchangeRate(from: string, to: string): Promise<ExchangeRate | null> {
  const raw = await fetchConsumerApi<{ rate?: number }>(`/consumer/exchange/rates?from=${from}&to=${to}`);
  if (typeof raw?.rate !== `number`) return null;
  return { from, to, rate: raw.rate };
}

function normalizeExchangeRateBatchItem(
  pair: { from: string; to: string },
  item?: ExchangeRateBatchItem,
): ExchangeRateCard {
  if (typeof item?.rate === `number`) {
    return {
      from: pair.from,
      to: pair.to,
      rate: item.rate,
      status: `available`,
    };
  }

  if (item?.code === `RATE_STALE`) {
    return {
      from: pair.from,
      to: pair.to,
      rate: null,
      status: `stale`,
    };
  }

  return {
    from: pair.from,
    to: pair.to,
    rate: null,
    status: `unavailable`,
  };
}

export async function getExchangeRatesBatch(
  pairs: Array<{ from: string; to: string }>,
  options?: ConsumerApiRequestOptions,
): Promise<ExchangeRatesBatchResult> {
  if (pairs.length === 0) return { items: [], unavailable: false };

  const raw = await postConsumerApi<{
    data?: ExchangeRateBatchItem[];
  }>(`/consumer/exchange/rates/batch`, { pairs }, options);

  if (!Array.isArray(raw?.data)) {
    return { items: [], unavailable: true };
  }

  const rowsByPair = new Map<string, ExchangeRateBatchItem>();
  for (const item of raw.data) {
    if (typeof item?.from !== `string` || typeof item?.to !== `string`) continue;
    rowsByPair.set(`${item.from}:${item.to}`, item);
  }

  return {
    items: pairs.map((pair) => normalizeExchangeRateBatchItem(pair, rowsByPair.get(`${pair.from}:${pair.to}`))),
    unavailable: false,
  };
}

export async function getExchangeRules(
  page = 1,
  pageSize = 10,
  options?: ConsumerApiRequestOptions,
): Promise<{ items: ExchangeRule[]; total: number } | null> {
  return fetchConsumerApi<{ items: ExchangeRule[]; total: number }>(
    `/consumer/exchange/rules?page=${page}&pageSize=${pageSize}`,
    options,
  );
}

export async function getScheduledConversions(
  page = 1,
  pageSize = 10,
  options?: ConsumerApiRequestOptions,
): Promise<{ items: ScheduledConversion[]; total: number } | null> {
  return fetchConsumerApi<{ items: ScheduledConversion[]; total: number }>(
    `/consumer/exchange/scheduled?page=${page}&pageSize=${pageSize}`,
    options,
  );
}
