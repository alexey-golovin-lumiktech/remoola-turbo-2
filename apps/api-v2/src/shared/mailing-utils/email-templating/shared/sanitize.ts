const ENTITY_MAP: Record<string, string> = {
  '&': `&amp;`,
  '<': `&lt;`,
  '>': `&gt;`,
  '"': `&quot;`,
  "'": `&#39;`,
};

const ENTITY_RE = /[&<>"']/g;

export function escapeHtml(input: string): string {
  return input.replace(ENTITY_RE, (ch) => ENTITY_MAP[ch] ?? ch);
}

/**
 * Escapes a string for safe embedding into HTML attribute values.
 * Also normalizes control characters that can break markup.
 */
export function escapeAttr(input: string): string {
  // eslint-disable-next-line no-control-regex -- strips control chars before embedding user input in HTML attributes.
  const normalized = input.replace(/[\u0000-\u001F\u007F]+/g, ` `);
  return escapeHtml(normalized);
}

export function safeHttpUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === `http:` || parsed.protocol === `https:`) return parsed.toString();
  } catch {
    // ignore
  }

  return null;
}
