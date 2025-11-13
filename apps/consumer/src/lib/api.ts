export const API = process.env.NEXT_PUBLIC_API_BASE_URL!;

const doFetch = (path: string, init?: RequestInit) => {
  return fetch(API + path, {
    credentials: `include`,
    ...init,
    headers: { 'Content-Type': `application/json`, ...(init?.headers || {}) },
  });
};

type BackendResponse<T> = {
  requestId: string;
  timestamp: string;
  path: string;
  data: T;
  version: string;
};

export const raw = async <T>(path: string, init?: RequestInit) => {
  let request = await doFetch(path, init);

  if (request.status == 401) {
    const refreshRequest = await fetch(API + `/auth/refresh`, { method: `POST`, credentials: `include` });
    if (refreshRequest.ok) request = await doFetch(path, init);
  }

  if (!request.ok) throw new Error(await request.text());
  const text = await request.text();
  if (!text) return null;
  const { data, ...response }: BackendResponse<T> = JSON.parse(text);
  console.log(`[${request.status}] response: ` + JSON.stringify(response, null, -1));
  return data;
};

export const getJson = <T>(p: string) => raw<T>(p) as Promise<T>;

export const postJson = <T>(p: string, body: unknown) =>
  raw<T>(p, { method: `POST`, body: JSON.stringify(body) }) as Promise<T>;

export const putJson = <T>(p: string, body: unknown) =>
  raw<T>(p, { method: `PUT`, body: JSON.stringify(body) }) as Promise<T>;

export const patchJson = <T>(p: string, body: unknown) =>
  raw<T>(p, { method: `PATCH`, body: JSON.stringify(body) }) as Promise<T>;

const join = (...args: string[]) => `/` + args.filter(Boolean).join(`/`);
const search = (path: string, input?: string) => (input ? `${path}?search=${encodeURIComponent(input)}` : path);

export const api = {
  payments: {
    post: () => {},
  },
  contracts: {
    get: <T>(init?: RequestInit) => {
      return raw<T>(join(`consumer`, `contracts`), init);
    },
    getById: <T>(id: string, init?: RequestInit) => {
      return raw<T>(join(`consumer`, `contracts`, id), init);
    },
    create: <T, B>(body: B) => {
      return raw<T>(join(`consumer`, `contracts`), { method: `POST`, body: JSON.stringify(body) });
    },
  },
  documents: {
    get: () => {},
    presigned: () => {},
  },
};
