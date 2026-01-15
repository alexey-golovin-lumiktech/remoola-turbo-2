export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string; raw?: any }> {
  const res = await fetch(path, {
    credentials: `include`,
    headers: { 'content-type': `application/json`, ...(init?.headers || {}) },
    ...init,
  });

  const text = await res.text();
  const parsed = text ? safeJson(text) : null;

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      message: parsed?.message || res.statusText,
      raw: parsed,
    };
  }

  return { ok: true, data: (parsed ?? null) as T };
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}
