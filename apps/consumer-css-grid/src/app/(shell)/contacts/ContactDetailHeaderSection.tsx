import { type ContactDetailsResponse } from '../../../lib/consumer-api.server';
import { StatusPill } from '../../../shared/ui/shell-indicators';

function getContactTitle(contact: ContactDetailsResponse, contactId: string) {
  return contact.name || contact.email || `Contact ${contactId.slice(0, 8)}`;
}

function getInitials(contact: ContactDetailsResponse, contactId: string) {
  const seed = contact.name?.trim() || contact.email?.trim() || contactId.slice(0, 2);
  const parts = seed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ``}${parts[parts.length - 1]?.[0] ?? ``}`.toUpperCase();
  }
  return seed.slice(0, 2).toUpperCase();
}

export function ContactDetailHeaderSection({
  addressLabel,
  contact,
  contactId,
}: {
  addressLabel: string;
  contact: ContactDetailsResponse;
  contactId: string;
}) {
  return (
    <section className="rounded-[28px] border border-(--app-border) bg-(--app-card-gradient) p-5 shadow-(--app-shadow)">
      <div className="grid grid-cols-[auto_1fr] gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-[26px] bg-(--app-primary) shadow-(--app-shadow)">
          <span className="text-2xl font-semibold text-(--app-primary-contrast)">
            {getInitials(contact, contactId)}
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-3xl font-semibold tracking-tight text-(--app-text)">
              {getContactTitle(contact, contactId)}
            </h2>
            <StatusPill status="Connected" />
          </div>
          <div className="mt-2 text-sm text-(--app-text-muted)">
            Read-only details from the current contacts contract plus matching payment records for this email.
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3">
              <div className="text-xs uppercase tracking-[0.18em] text-(--app-text-faint)">Email</div>
              <div className="mt-2 break-all text-sm text-(--app-primary)">{contact.email || `No email available`}</div>
            </div>
            <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3">
              <div className="text-xs uppercase tracking-[0.18em] text-(--app-text-faint)">Address</div>
              <div className="mt-2 text-sm text-(--app-text-soft)">{addressLabel}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
