/**
 * Ultimate API client for Next.js / Remoola admin:
 * ✅ Auto-refresh, retries, timeout, concurrency limiting
 * ✅ Memory + IndexedDB caching with TTL
 * ✅ Automatic dependency invalidation
 * ✅ SWR (stale-while-revalidate) for instant + fresh data
 */

import { openDatabase, DB } from './db'; // ← uses the robust DB layer

/* -------------------------------------------------------------------------- */
/*                               Global Constants                             */
/* -------------------------------------------------------------------------- */
const API = process.env.NEXT_PUBLIC_API_BASE_URL!;
const DEFAULT_HEADERS = { 'content-type': `application/json` };

/* -------------------------------------------------------------------------- */
/*                              Error Definition                              */
/* -------------------------------------------------------------------------- */
export class HttpError extends Error {
  constructor(
    public status: number,
    public path: string,
    public body?: unknown,
  ) {
    super(`HTTP ${status} on ${path}`);
  }
}

/* -------------------------------------------------------------------------- */
/*                            Concurrency Limiting                             */
/* -------------------------------------------------------------------------- */
const MAX_CONCURRENT = 8;
let active = 0;
const queue: (() => void)[] = [];

async function acquire() {
  if (active >= MAX_CONCURRENT) await new Promise<void>((r) => queue.push(r));
  active++;
}
function release() {
  active--;
  const next = queue.shift();
  if (next) next();
}

/* -------------------------------------------------------------------------- */
/*                       Persistent IndexedDB Cache Layer                      */
/* -------------------------------------------------------------------------- */

const CACHE_DB_NAME = `remoola_api_cache`;
const CACHE_VERSION = 2;
const CACHE_STORE = `responses`;

interface CacheEntry {
  value: unknown;
  expiresAt: number;
  updatedAt: number;
}

let cacheDB: IDBDatabase | null = null;

async function getCacheDB(): Promise<IDBDatabase> {
  if (cacheDB) return cacheDB;

  cacheDB = await openDatabase({
    name: CACHE_DB_NAME,
    version: CACHE_VERSION,
    stores: [{ name: CACHE_STORE }],
    async onUpgrade(db, oldVersion) {
      if (oldVersion < 2) {
        // Clean migration example: recreate store for schema changes
        if (db.objectStoreNames.contains(CACHE_STORE)) {
          db.deleteObjectStore(CACHE_STORE);
        }
        db.createObjectStore(CACHE_STORE);
        console.info(`[CacheDB] Upgraded to version ${CACHE_VERSION}`);
      }
    },
  });

  return cacheDB;
}

async function cacheGet(key: string): Promise<CacheEntry | null> {
  try {
    const db = await getCacheDB();
    const entry = await DB.get<CacheEntry>(db, CACHE_STORE, key);
    return entry || null;
  } catch {
    return null;
  }
}

async function cacheSet(key: string, entry: CacheEntry) {
  try {
    const db = await getCacheDB();
    await DB.put(db, CACHE_STORE, entry, key);
  } catch {
    console.warn(`cacheSet FAIL`);
  }
}

async function cacheClearPrefix(prefix: string) {
  try {
    const db = await getCacheDB();
    await DB.deleteWhereKey(db, CACHE_STORE, (k) => String(k).includes(prefix));
  } catch (e) {
    console.warn(`cacheClearPrefix FAIL`, e);
  }
}

/* -------------------------------------------------------------------------- */
/*                           In-Memory Cache Mirror                            */
/* -------------------------------------------------------------------------- */
const memCache = new Map<string, CacheEntry>();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of memCache) if (v.expiresAt < now) memCache.delete(k);
}, 30_000);

function getCacheKey(path: string, init?: RequestOptions) {
  const body = typeof init?.body === `string` ? init.body : ``;
  return `${init?.method ?? `GET`}:${path}:${body}`;
}

/* -------------------------------------------------------------------------- */
/*                        Dependency Graph for Invalidation                    */
/* -------------------------------------------------------------------------- */
const DEPENDENCY_GRAPH: Record<string, string[]> = {
  contracts: [`clients`, `payments`, `documents`],
  clients: [`contracts`, `documents`],
  contractors: [`contracts`],
  payments: [`clients`],
};

function extractDomainKey(path: string): string | null {
  const parts = path.split(`/`).filter(Boolean);
  return parts.length >= 2 && typeof parts[1] === `string` ? parts[1] : null;
}

function invalidatePrefix(prefix: string) {
  for (const k of [...memCache.keys()]) if (k.includes(prefix)) memCache.delete(k);
  cacheClearPrefix(prefix);
}

/* -------------------------------------------------------------------------- */
/*                              Fetch + Retry Core                             */
/* -------------------------------------------------------------------------- */
async function doFetch(path: string, init: RequestOptions = {}, retries = 2): Promise<Response> {
  await acquire();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const { cache, ...rest } = init; // eslint-disable-line @typescript-eslint/no-unused-vars
    const res = await fetch(API + path, {
      credentials: `include`,
      ...rest,
      signal: controller.signal,
      headers: { ...DEFAULT_HEADERS, ...(init?.headers || {}) },
    });
    if ([502, 503, 504].includes(res.status) && retries > 0) {
      await new Promise((r) => setTimeout(r, (3 - retries) * 500));
      return doFetch(path, init, retries - 1);
    }
    return res;
  } finally {
    clearTimeout(timeout);
    release();
  }
}

/* -------------------------------------------------------------------------- */
/*                             Request Wrapper (SWR)                           */
/* -------------------------------------------------------------------------- */
type BackendResponse<T> = {
  requestId: string;
  timestamp: string;
  path: string;
  data: T;
  version: string;
};

type RequestOptions = Omit<RequestInit, `cache`> & {
  cache?: boolean | { ttl?: number; staleAfter?: number };
};

export async function request<T>(path: string, init?: RequestOptions): Promise<T | null> {
  const method = init?.method?.toUpperCase() ?? `GET`;
  const key = getCacheKey(path, init);
  const now = Date.now();

  // 1️⃣ Serve cache instantly (SWR)
  if (method === `GET`) {
    const memHit = memCache.get(key);
    if (memHit && memHit.expiresAt > now) {
      const staleAfter = typeof init?.cache === `object` ? (init.cache.staleAfter ?? 10_000) : 10_000;
      if (now - memHit.updatedAt > staleAfter) {
        revalidateInBackground<T>(path, init, key);
      }
      return memHit.value as T;
    }

    const diskHit = await cacheGet(key);
    if (diskHit && diskHit.expiresAt > now) {
      memCache.set(key, diskHit);
      const staleAfter = typeof init?.cache === `object` ? (init.cache.staleAfter ?? 10_000) : 10_000;
      if (now - diskHit.updatedAt > staleAfter) {
        revalidateInBackground<T>(path, init, key);
      }
      return diskHit.value as T;
    }
  }

  // 2️⃣ No cache → normal fetch
  let res = await doFetch(path, init);

  // Refresh auth if needed
  if (res.status === 401) {
    const refresh = await doFetch(`/auth/refresh`, { method: `POST` });
    if (refresh.ok) res = await doFetch(path, init);
  }

  if (!res.ok) {
    let errorBody: unknown;
    try {
      errorBody = await res.clone().json();
    } catch {
      errorBody = await res.text();
    }
    throw new HttpError(res.status, path, errorBody);
  }

  // Invalidate dependencies on mutation
  if ([`POST`, `PATCH`, `DELETE`].includes(method)) {
    const domain = extractDomainKey(path);
    if (domain) {
      invalidatePrefix(domain);
      const deps = DEPENDENCY_GRAPH[domain];
      if (deps) deps.forEach((dep) => invalidatePrefix(dep));
    }
  }

  const contentType = res.headers.get(`content-type`);
  if (!contentType?.includes(`application/json`)) return null;

  const json: BackendResponse<T> = await res.json();
  const result = json.data ?? null;

  // Cache result
  if (method === `GET` && init?.cache && result !== null) {
    const ttl = typeof init.cache === `object` ? (init.cache.ttl ?? 30_000) : 30_000;
    const entry: CacheEntry = { value: result, expiresAt: now + ttl, updatedAt: now };
    memCache.set(key, entry);
    cacheSet(key, entry);
  }

  return result;
}

/* -------------------------------------------------------------------------- */
/*                        Background SWR Revalidation Logic                    */
/* -------------------------------------------------------------------------- */
async function revalidateInBackground<T>(path: string, init: RequestOptions | undefined, key: string) {
  try {
    const res = await doFetch(path, init);
    if (!res.ok) return;
    const contentType = res.headers.get(`content-type`);
    if (!contentType?.includes(`application/json`)) return;
    const json: BackendResponse<T> = await res.json();
    const result = json.data ?? null;
    if (result) {
      const entry: CacheEntry = {
        value: result,
        expiresAt: Date.now() + (typeof init?.cache === `object` ? (init.cache.ttl ?? 30_000) : 30_000),
        updatedAt: Date.now(),
      };
      memCache.set(key, entry);
      cacheSet(key, entry);
      if (process.env.NODE_ENV === `development`) console.debug(`[SWR refresh] ${path}`);
    }
  } catch {
    // ignore background revalidation errors
  }
}

/* -------------------------------------------------------------------------- */
/*                                 Utilities                                  */
/* -------------------------------------------------------------------------- */
const join = (...args: string[]) => `/` + args.filter(Boolean).join(`/`);
const search = (path: string, input?: string) => (input ? `${path}?search=${encodeURIComponent(input)}` : path);

/* -------------------------------------------------------------------------- */
/*                                 API Object                                 */
/* -------------------------------------------------------------------------- */
export const api = {
  admins: {
    search: <T>(input?: string, init?: Pick<RequestOptions, `signal` | `cache`>) =>
      request<T>(search(join(`admin`, `admins`), input), { ...init, cache: true }),
    getById: <T>(id: string, init?: Pick<RequestOptions, `signal` | `cache`>) =>
      request<T>(join(`admin`, `admins`, id), { ...init, cache: true }),
  },
  clients: {
    search: <T>(input?: string, init?: Pick<RequestOptions, `signal` | `cache`>) =>
      request<T>(search(join(`admin`, `clients`), input), { ...init, cache: true }),
    getById: <T>(id: string, init?: Pick<RequestOptions, `signal` | `cache`>) =>
      request<T>(join(`admin`, `clients`, id), { ...init, cache: true }),
  },
  contractors: {
    search: <T>(input?: string, init?: Pick<RequestOptions, `signal` | `cache`>) =>
      request<T>(search(join(`admin`, `contractors`), input), { ...init, cache: true }),
    create: <T, B>(body: B) => request<T>(join(`admin`, `contractors`), { method: `POST`, body: JSON.stringify(body) }),
    patch: <T, B>(id: string, body: B) =>
      request<T>(join(`admin`, `contractors`, id), { method: `PATCH`, body: JSON.stringify(body) }),
    delete: <T>(id: string) => request<T>(join(`admin`, `contractors`, id), { method: `DELETE` }),
  },
  globalSearch: {
    search: <T>(input?: string, init?: Pick<RequestOptions, `signal` | `cache`>) =>
      request<T>(search(join(`admin`, `global-search`), input), { ...init, cache: true }),
  },
  contracts: {
    list: <T>(init?: Pick<RequestOptions, `signal` | `cache`>) =>
      request<T>(join(`admin`, `contracts`), { ...init, cache: true }),
    patch: <T, B>(id: string, body: B) =>
      request<T>(join(`admin`, `contracts`, id), { method: `PATCH`, body: JSON.stringify(body) }),
    delete: <T>(id: string) => request<T>(join(`admin`, `contracts`, id), { method: `DELETE` }),
  },
  documents: {
    search: <T>(input?: string, init?: Pick<RequestOptions, `signal` | `cache`>) =>
      request<T>(search(join(`admin`, `documents`), input), { ...init, cache: true }),
    delete: <T>(id: string) => request<T>(join(`admin`, `documents`, id), { method: `DELETE` }),
  },
  payments: {
    list: <T>(init?: Pick<RequestOptions, `signal` | `cache`>) =>
      request<T>(join(`admin`, `payments`), { ...init, cache: true }),
    delete: <T>(id: string) => request<T>(join(`admin`, `payments`, id), { method: `DELETE` }),
  },
  users: {
    patch: <T>(id: string, body: { role: `admin` | `superadmin` | `client` }) =>
      request<T>(join(`admin`, `users`, id, `role`), {
        method: `PATCH`,
        body: JSON.stringify(body),
      }),
  },
};
