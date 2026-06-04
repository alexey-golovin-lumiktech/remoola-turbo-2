import { nestedPanelClass, rawDataClass } from '../../../../components/ui-classes';

export const nestedCardClass = nestedPanelClass;

export function renderConsumerLabel(email: string | null | undefined, consumerId: string): string {
  return email ?? consumerId;
}

function formatPreviewValue(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  if (typeof value === `string`) {
    return value;
  }
  if (typeof value === `number` || typeof value === `boolean`) {
    return String(value);
  }
  return null;
}

function formatPreviewLabel(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, `$1 $2`)
    .replaceAll(`_`, ` `)
    .replace(/^\w/, (char) => char.toUpperCase());
}

function buildPreviewEntries(value: Record<string, unknown>, preferredKeys: ReadonlyArray<string>) {
  const preferred = preferredKeys
    .map((key) => {
      const formatted = formatPreviewValue(value[key]);
      return formatted ? { label: formatPreviewLabel(key), value: formatted } : null;
    })
    .filter((entry): entry is { label: string; value: string } => entry !== null);

  if (preferred.length > 0) {
    return preferred;
  }

  return Object.entries(value)
    .map(([key, raw]) => {
      const formatted = formatPreviewValue(raw);
      return formatted ? { label: formatPreviewLabel(key), value: formatted } : null;
    })
    .filter((entry): entry is { label: string; value: string } => entry !== null)
    .slice(0, 4);
}

export function renderObject(value: Record<string, unknown> | null, preferredKeys: ReadonlyArray<string> = []) {
  if (!value) return <p className="muted">No data.</p>;

  const previewEntries = buildPreviewEntries(value, preferredKeys);
  const fieldCount = Object.keys(value).length;

  return (
    <div className="flex flex-col gap-3">
      {previewEntries.length > 0 ? (
        <div className={nestedCardClass}>
          <div className="grid gap-2 md:grid-cols-2">
            {previewEntries.map((entry) => (
              <div key={`${entry.label}-${entry.value}`} className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">{entry.label}</div>
                <div className="mt-1 text-sm text-white/88">{entry.value}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <details className={nestedCardClass}>
        <summary className="cursor-pointer text-sm text-white/72">
          View raw record ({fieldCount} field{fieldCount === 1 ? `` : `s`})
        </summary>
        <pre className={rawDataClass}>{JSON.stringify(value, null, 2)}</pre>
      </details>
    </div>
  );
}
