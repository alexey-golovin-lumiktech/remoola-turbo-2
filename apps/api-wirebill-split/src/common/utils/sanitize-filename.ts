import { extname } from 'path';

export function sanitizeFilename(raw: string): string {
  // Fix mojibake (latin1 → utf8)
  let name = Buffer.from(raw, `latin1`).toString(`utf8`);

  // Normalize unicode
  name = name.normalize(`NFC`);

  const ext = extname(name);
  let base = name.slice(0, -ext.length);

  // Remove dangerous characters (ESLint-safe)
  base = base.replace(/[\p{Cc}<>:"/\\|?*]/gu, ``);

  // Replace whitespace with hyphens
  base = base.replace(/\s+/g, `-`);

  // Remove leading/trailing dots/hyphens
  base = base.replace(/^[.\-]+|[.\-]+$/g, ``);

  // Collapse repeated hyphens
  base = base.replace(/-+/g, `-`);

  // Limit the length of the filename (no extension)
  if (base.length > 80) {
    base = base.substring(0, 80);
  }

  // Clean extension (also remove control chars)
  const cleanedExt = ext.replace(/[\p{Cc}<>:"/\\|?*]/gu, ``);

  return `${base}${cleanedExt}`;
}
