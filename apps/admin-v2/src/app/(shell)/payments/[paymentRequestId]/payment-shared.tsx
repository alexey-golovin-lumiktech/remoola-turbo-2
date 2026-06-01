import { mutedTextClass, nestedPanelClass, rawDataClass } from '../../../../components/ui-classes';
import { formatDateTime } from '../../../../lib/admin-format';

export function renderActorLabel(actor: { email?: string | null; id?: string | null }): string {
  return actor.email ?? actor.id ?? `-`;
}

export const formatDate = formatDateTime;

export function renderMetadata(value: Record<string, unknown> | null | undefined) {
  if (!value || Object.keys(value).length === 0) {
    return <p className={mutedTextClass}>No metadata.</p>;
  }

  const keys = Object.keys(value);

  return (
    <details className={nestedPanelClass}>
      <summary className="cursor-pointer text-sm text-white/72">
        Metadata ({keys.length} key{keys.length === 1 ? `` : `s`})
      </summary>
      <pre className={rawDataClass}>{JSON.stringify(value, null, 2)}</pre>
    </details>
  );
}
