import { type ContactDetailsResponse } from '../../../lib/consumer-api.server';
import { Panel } from '../../../shared/ui/shell-panel';

export function ContactDetailContactRecordSection({
  addressLabel,
  contact,
}: {
  addressLabel: string;
  contact: ContactDetailsResponse;
}) {
  return (
    <Panel title="Contact record">
      <div className="space-y-3">
        <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-sm text-(--app-text-soft)">
          Name: {contact.name?.trim() ? contact.name : `No saved name`}
        </div>
        <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-sm text-(--app-text-soft)">
          Email: {contact.email?.trim() ? contact.email : `No email available`}
        </div>
        <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-sm text-(--app-text-soft)">
          Address: {addressLabel}
        </div>
        <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-sm text-(--app-text-soft)">
          Contact id: {contact.id}
        </div>
      </div>
    </Panel>
  );
}
