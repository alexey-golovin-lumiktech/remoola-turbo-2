import Link from 'next/link';

import type { ContactDetails } from '../schemas';

interface ContactDetailViewProps {
  contactDetails: ContactDetails | null;
  contactId: string;
}

function formatDate(dateString: string | undefined): string {
  if (!dateString) return `N/A`;
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(`en-US`, {
      year: `numeric`,
      month: `short`,
      day: `numeric`,
    });
  } catch {
    return `N/A`;
  }
}

function formatAddress(address: ContactDetails[`address`]): string | null {
  if (!address) return null;
  const parts = [address.street, address.city, address.state, address.postalCode, address.country].filter(Boolean);
  return parts.length > 0 ? parts.join(`, `) : null;
}

export function ContactDetailView({ contactDetails, contactId }: ContactDetailViewProps) {
  if (!contactDetails) {
    return (
      <div className="space-y-4" data-testid="consumer-mobile-contact-detail">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/50">
          <p className="text-sm text-slate-600 dark:text-slate-400">Contact not found.</p>
        </div>
        <Link
          href="/contacts"
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
        >
          Back to contacts
        </Link>
      </div>
    );
  }

  const formattedAddress = formatAddress(contactDetails.address);

  return (
    <div className="space-y-6" data-testid="consumer-mobile-contact-detail">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {contactDetails.name ?? contactDetails.email ?? contactId.slice(0, 8)}
          </h1>
          {contactDetails.name && contactDetails.email && (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{contactDetails.email}</p>
          )}
        </div>
        <Link
          href="/contacts"
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
        >
          Back
        </Link>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Contact Information</h2>
          <dl className="space-y-3 text-sm">
            {contactDetails.email && (
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Email</dt>
                <dd className="mt-1 font-medium text-slate-900 dark:text-white">
                  <a
                    href={`mailto:${contactDetails.email}`}
                    className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                  >
                    {contactDetails.email}
                  </a>
                </dd>
              </div>
            )}
            {formattedAddress && (
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Address</dt>
                <dd className="mt-1 font-medium text-slate-900 dark:text-white">{formattedAddress}</dd>
              </div>
            )}
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Contact ID</dt>
              <dd className="mt-1 font-mono text-xs text-slate-700 dark:text-slate-300">{contactDetails.id}</dd>
            </div>
            {contactDetails.createdAt && (
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Created</dt>
                <dd className="mt-1 font-medium text-slate-900 dark:text-white">
                  {formatDate(contactDetails.createdAt)}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Payment Requests</h2>
          {contactDetails.paymentRequests.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No payment requests</p>
          ) : (
            <div className="space-y-2">
              {contactDetails.paymentRequests.map((pr) => (
                <Link
                  key={pr.id}
                  href={`/payments/${pr.id}`}
                  className="group block rounded-lg border border-slate-200 p-3 transition-colors hover:border-primary-300 hover:bg-primary-50 dark:border-slate-700 dark:hover:border-primary-700 dark:hover:bg-primary-900/10"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white">${pr.amount}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            pr.status === `completed`
                              ? `bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400`
                              : pr.status === `pending`
                                ? `bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400`
                                : `bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300`
                          }`}
                        >
                          {pr.status}
                        </span>
                      </div>
                      {pr.description && (
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{pr.description}</p>
                      )}
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">{formatDate(pr.createdAt)}</p>
                    </div>
                    <svg
                      className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Documents</h2>
          {contactDetails.documents.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No documents</p>
          ) : (
            <div className="space-y-2">
              {contactDetails.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700">
                      <svg
                        className="h-5 w-5 text-slate-600 dark:text-slate-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{doc.name}</p>
                      {doc.createdAt && (
                        <p className="text-xs text-slate-500 dark:text-slate-500">{formatDate(doc.createdAt)}</p>
                      )}
                    </div>
                  </div>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Download
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
