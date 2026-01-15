export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string; raw?: any }> {
  const response = await fetch(path, {
    credentials: `include`,
    headers: { 'content-type': `application/json`, ...(init?.headers || {}) },
    ...init,
  });

  const text = await response.text();
  const parsed = text ? safeJson(text) : null;

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: parsed?.message || response.statusText,
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
