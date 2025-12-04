import { type Prisma } from '@remoola/database-2';

/**
 * Robustly extracts details from PrismaClientValidationError across versions.
 * Returns a concise human-readable sentence with best-effort structure.
 */
export function extractPrismaValidationDetails(error: Prisma.PrismaClientValidationError): string {
  const raw = (error?.message ?? ``).trim();
  if (!raw) return `Invalid Prisma query or data.`;

  const msg = raw
    .replace(/\r/g, ``)
    .replace(/[ \t]+\n/g, `\n`)
    .replace(/\n{2,}/g, `\n`)
    .replace(/[ \t]{2,}/g, ` `)
    .trim();

  const sentence = (e: { field?: string; issue: string; expected?: string; received?: string }): string => {
    const parts = [];
    if (e.field) parts.push(`Field \`${e.field}\``);
    parts.push(e.issue);
    if (e.expected) parts.push(`expected ${e.expected}`);
    if (e.received) parts.push(`but received ${e.received}`);
    const text = parts.join(` `);
    return text.endsWith(`.`) ? text : `${text}.`;
  };

  const detectors: ((m: string) => any | null)[] = [
    // Must not be null / undefined
    (m) => {
      const r = m.match(/Argument\s+`(.+?)`\s+must\s+not\s+be\s+(null|undefined)/i);
      if (!r) return null;
      const [, field, value] = r;
      return { field, issue: `must not be ${value}` };
    },

    // Missing required argument
    (m) => {
      const r = m.match(/Argument\s+`(.+?)`\s+(?:is\s+missing|missing\s+required)/i);
      if (!r) return null;
      const [, field] = r;
      return { field, issue: `is required` };
    },

    // Null for non-nullable field
    (m) => {
      const r = m.match(/Provided\s+null\s+for\s+non-nullable\s+field\s+`(.+?)`/i);
      if (!r) return null;
      const [, field] = r;
      return { field, issue: `cannot be null` };
    },

    // Type mismatch
    (m) => {
      const r = m.match(
        /Argument\s+`(.+?)`.*?Expected\s+([A-Za-z0-9_\[\]\|\s]+).*?(?:but|got|received)\s+([A-Za-z0-9_\[\]\|\s]+)/i,
      );
      if (!r) return null;
      const [, field, expected, received] = r;
      return { field, issue: `type mismatch`, expected, received };
    },

    // Invalid enum value
    (m) => {
      const r = m.match(/Invalid enum value.*?Expected one of:\s+([A-Z0-9_,\s]+).*?for\s+`(.+?)`/i);
      if (!r) return null;
      const [, expected, field] = r;
      return { field, issue: `has invalid enum value`, expected };
    },

    // Unknown argument
    (m) => {
      const r = m.match(/Unknown (?:arg|argument)\s+`(.+?)`\s+in\s+([^\s]+)\s+for\s+type\s+([A-Za-z0-9_]+)/i);
      if (!r) return null;
      const [, field, , type] = r;
      return { field, issue: `is not allowed (in ${type})` };
    },

    // Fallback: just say invalid
    (m) => {
      const r = m.match(/Argument\s+`(.+?)`/i);
      if (!r) return null;
      const [, field] = r;
      return { field, issue: `is invalid` };
    },
  ];

  for (const d of detectors) {
    const hit = d(msg);
    if (hit) return sentence(hit);
  }

  const fallback = msg.replace(/\s+/g, ` `).trim();
  return fallback.length > 300 ? `${fallback.slice(0, 300)}…` : fallback;
}
