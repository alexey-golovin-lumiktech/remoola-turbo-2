import Link from 'next/link';

import { type ContactDetailsResponse } from '../../../lib/consumer-api.server';
import { DocumentIcon } from '../../../shared/ui/icons/DocumentIcon';
import { UsersIcon } from '../../../shared/ui/icons/UsersIcon';
import { shellGridDetail3 } from '../../../shared/ui/shell-grid-tokens';
import { StatusPill } from '../../../shared/ui/shell-indicators';
import { shellMainAsideBalanced } from '../../../shared/ui/shell-layout-tokens';
import { Panel } from '../../../shared/ui/shell-panel';

function formatDateTime(value: string | null | undefined) {
  if (!value) return `—`;
  return new Date(value).toLocaleString(`en-US`, {
    year: `numeric`,
    month: `short`,
    day: `2-digit`,
    hour: `2-digit`,
    minute: `2-digit`,
  });
}

function formatDateOnly(value: string | null | undefined) {
  if (!value) return `—`;
  return new Date(value).toLocaleDateString(`en-US`, {
    year: `numeric`,
    month: `short`,
    day: `2-digit`,
  });
}

function formatStatusLabel(status: string) {
  return status
    .toLowerCase()
    .split(`_`)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(` `);
}

function formatAddress(contact: ContactDetailsResponse | null) {
  if (!contact?.address) return `No address details`;
  const parts = [
    contact.address.street,
    contact.address.city,
    contact.address.state,
    contact.address.postalCode,
    contact.address.country,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(`, `) : `No address details`;
}

function getContactTitle(contact: ContactDetailsResponse | null, contactId: string) {
  return contact?.name || contact?.email || `Contact ${contactId.slice(0, 8)}`;
}

function getInitials(contact: ContactDetailsResponse | null, contactId: string) {
  const seed = contact?.name?.trim() || contact?.email?.trim() || contactId.slice(0, 2);
  const parts = seed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ``}${parts[parts.length - 1]?.[0] ?? ``}`.toUpperCase();
  }
  return seed.slice(0, 2).toUpperCase();
}

type Props = {
  contact: ContactDetailsResponse | null;
  contactId: string;
};

export function ContactDetailView({ contact, contactId }: Props) {
  const totalPayments = contact?.paymentRequests.length ?? 0;
  const completedPayments =
    contact?.paymentRequests.filter((payment) => payment.status.toUpperCase() === `COMPLETED`).length ?? 0;
  const totalDocuments = contact?.documents.length ?? 0;

  if (!contact) {
    return (
      <Panel title="Contact details">
        <div className="space-y-4">
          <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-10 text-center text-sm text-(--app-text-muted)">
            Contact details are unavailable for this record.
          </div>
          <Link href="/contacts" className="inline-flex text-sm text-(--app-primary) hover:text-(--app-primary-strong)">
            Back to contacts
          </Link>
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      <div className="mb-1">
        <Link href="/contacts" className="text-sm text-(--app-primary) hover:text-(--app-primary-strong)">
          Back to contacts
        </Link>
      </div>

      <section className={shellMainAsideBalanced}>
        <div className="space-y-5">
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
                    <div className="mt-2 break-all text-sm text-(--app-primary)">
                      {contact.email || `No email available`}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-(--app-text-faint)">Address</div>
                    <div className="mt-2 text-sm text-(--app-text-soft)">{formatAddress(contact)}</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className={shellGridDetail3}>
            <div className="rounded-[24px] border border-(--app-border) bg-(--app-surface-muted) p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-(--app-text-faint)">Matching payments</div>
              <div className="mt-3 text-4xl font-semibold tracking-tight text-(--app-text)">{totalPayments}</div>
              <div className="mt-2 text-sm text-(--app-text-muted)">
                Records where this email appears as payer or requester
              </div>
            </div>
            <div className="rounded-[24px] border border-(--app-border) bg-(--app-surface-muted) p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-(--app-text-faint)">Completed</div>
              <div className="mt-3 text-4xl font-semibold tracking-tight text-(--app-success-text)">
                {completedPayments}
              </div>
              <div className="mt-2 text-sm text-(--app-text-muted)">
                Based on the effective status returned by the backend
              </div>
            </div>
            <div className="rounded-[24px] border border-(--app-border) bg-(--app-surface-muted) p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-(--app-text-faint)">Documents</div>
              <div className="mt-3 text-4xl font-semibold tracking-tight text-(--app-text)">{totalDocuments}</div>
              <div className="mt-2 text-sm text-(--app-text-muted)">
                Files attached to those matching payment records
              </div>
            </div>
          </section>

          <Panel title="Matching payment records" aside={`${totalPayments} total`}>
            <div className="mb-4 rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-sm text-(--app-text-soft)">
              This endpoint matches payment records by contact email and returns the amount, effective status, and
              created date for each record.
            </div>
            {totalPayments === 0 ? (
              <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-10 text-center text-sm text-(--app-text-muted)">
                No matching payment records yet.
              </div>
            ) : (
              <div className="space-y-3">
                {contact.paymentRequests.map((payment) => (
                  <Link
                    key={payment.id}
                    href={`/payments/${payment.id}`}
                    className="block rounded-2xl border border-(--app-border) bg-(--app-surface-muted) p-4 transition hover:border-(--app-border-strong) hover:bg-(--app-surface-muted)"
                  >
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-medium text-(--app-text)">Payment record</div>
                          <StatusPill status={formatStatusLabel(payment.status)} />
                        </div>
                        <div className="mt-2 text-sm text-(--app-text-muted)">
                          Created {formatDateOnly(payment.createdAt)}
                        </div>
                        <div className="mt-2 text-xs text-(--app-text-faint)">{payment.id}</div>
                      </div>
                      <div className="text-left md:text-right">
                        <div className="text-sm text-(--app-text-muted)">Amount from contact details endpoint</div>
                        <div className="mt-1 text-lg font-medium text-(--app-text)">{payment.amount}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Contact record">
            <div className="space-y-3">
              <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-sm text-(--app-text-soft)">
                Name: {contact.name?.trim() ? contact.name : `No saved name`}
              </div>
              <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-sm text-(--app-text-soft)">
                Email: {contact.email?.trim() ? contact.email : `No email available`}
              </div>
              <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-sm text-(--app-text-soft)">
                Address: {formatAddress(contact)}
              </div>
              <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-sm text-(--app-text-soft)">
                Contact id: {contact.id}
              </div>
            </div>
          </Panel>

          <Panel title="Files from matching payment records" aside={`${totalDocuments} total`}>
            {totalDocuments === 0 ? (
              <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-10 text-center text-sm text-(--app-text-muted)">
                No files are attached to matching payment records yet.
              </div>
            ) : (
              <div className="space-y-3">
                {contact.documents.map((document) => (
                  <div
                    key={document.id}
                    className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15 text-(--app-primary)">
                            <DocumentIcon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-(--app-text)">{document.name}</div>
                            <div className="mt-1 text-xs text-(--app-text-faint)">{document.id}</div>
                          </div>
                        </div>
                        <div className="mt-3 text-sm text-(--app-text-muted)">
                          Added {formatDateTime(document.createdAt)}
                        </div>
                      </div>
                      <a
                        href={document.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-xl border border-(--app-border) px-3 py-2 text-sm text-(--app-primary) transition hover:border-(--app-border-strong) hover:text-(--app-primary)"
                      >
                        Open
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

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
        </div>
      </section>
    </div>
  );
}
