import { rawDataClass } from '../../../../components/ui-classes';
import { formatDateTime } from '../../../../lib/admin-format';

export const formatDate = formatDateTime;

export function renderObject(value: Record<string, unknown> | null | undefined) {
  if (!value || Object.keys(value).length === 0) {
    return <p className="muted">No metadata.</p>;
  }

  return <pre className={rawDataClass}>{JSON.stringify(value, null, 2)}</pre>;
}
