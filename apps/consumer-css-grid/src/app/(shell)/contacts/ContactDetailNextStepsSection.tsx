import Link from 'next/link';

import { DocumentIcon } from '../../../shared/ui/icons/DocumentIcon';
import { UsersIcon } from '../../../shared/ui/icons/UsersIcon';
import { Panel } from '../../../shared/ui/shell-panel';

export function ContactDetailNextStepsSection() {
  return (
    <Panel title="Next steps">
      <div className="space-y-3">
        <Link
          href="/contacts"
          className="flex items-center gap-3 rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-sm text-(--app-text-soft) transition hover:border-(--app-border-strong) hover:bg-(--app-surface-muted)"
        >
          <UsersIcon className="h-5 w-5 text-(--app-primary)" />
          Back to the contacts list and edit this record there
        </Link>
        <Link
          href="/payments"
          className="flex items-center gap-3 rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-sm text-(--app-text-soft) transition hover:border-(--app-border-strong) hover:bg-(--app-surface-muted)"
        >
          <DocumentIcon className="h-5 w-5 text-(--app-primary)" />
          Open payments to review related request details
        </Link>
      </div>
    </Panel>
  );
}
