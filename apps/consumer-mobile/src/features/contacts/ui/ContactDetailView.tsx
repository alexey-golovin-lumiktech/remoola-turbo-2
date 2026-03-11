import Link from 'next/link';

import { CalendarIcon } from '../../../shared/ui/icons/CalendarIcon';
import { CheckIcon } from '../../../shared/ui/icons/CheckIcon';
import { ChevronLeftIcon } from '../../../shared/ui/icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../../../shared/ui/icons/ChevronRightIcon';
import { ClipboardCopyIcon } from '../../../shared/ui/icons/ClipboardCopyIcon';
import { CurrencyDollarIcon } from '../../../shared/ui/icons/CurrencyDollarIcon';
import { DocumentIcon } from '../../../shared/ui/icons/DocumentIcon';
import { DownloadIcon } from '../../../shared/ui/icons/DownloadIcon';
import { MailIcon } from '../../../shared/ui/icons/MailIcon';
import { MapPinIcon } from '../../../shared/ui/icons/MapPinIcon';
import { UserIcon } from '../../../shared/ui/icons/UserIcon';

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

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const first = parts[0]?.[0];
      const last = parts[parts.length - 1]?.[0];
      if (first && last) {
        return `${first}${last}`.toUpperCase();
      }
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return `??`;
}

export function ContactDetailView({ contactDetails, contactId }: ContactDetailViewProps) {
  if (!contactDetails) {
    return (
      <div className={`space-y-6 px-4 py-6`} data-testid="consumer-mobile-contact-detail">
        <div
          className={`
          rounded-xl
          border
          border-slate-200
          bg-linear-to-br
          from-slate-50
          to-slate-100/50
          p-12
          text-center
          shadow-xs
          dark:border-slate-700
          dark:from-slate-800/50
          dark:to-slate-800/30
        `}
        >
          <div
            className={`
            mx-auto
            mb-4
            flex
            h-16
            w-16
            items-center
            justify-center
            rounded-full
            bg-slate-200
            dark:bg-slate-700
          `}
          >
            <UserIcon size={32} className={`text-slate-400 dark:text-slate-500`} />
          </div>
          <h2
            className={`
            mb-2
            text-lg
            font-semibold
            text-slate-900
            dark:text-white
          `}
          >
            Contact Not Found
          </h2>
          <p className={`text-sm text-slate-600 dark:text-slate-400`}>
            The contact you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
        </div>
        <Link
          href="/contacts"
          className={`
            inline-flex
            min-h-11
            items-center
            justify-center
            gap-2
            rounded-xl
            bg-linear-to-r
            from-primary-600
            to-primary-700
            px-6
            py-3
            text-sm
            font-semibold
            text-white
            shadow-md
            shadow-primary-500/20
            transition-all
            hover:shadow-lg
            hover:shadow-primary-500/30
            active:scale-[0.98]
            dark:from-primary-500
            dark:to-primary-600
          `}
        >
          <ChevronLeftIcon size={18} />
          Back to Contacts
        </Link>
      </div>
    );
  }

  const formattedAddress = formatAddress(contactDetails.address);
  const initials = getInitials(contactDetails.name, contactDetails.email);
  const totalPayments = contactDetails.paymentRequests.length;
  const completedPayments = contactDetails.paymentRequests.filter((pr) => pr.status === `completed`).length;
  const totalDocuments = contactDetails.documents.length;

  return (
    <div className={`space-y-6 px-4 py-6`} data-testid="consumer-mobile-contact-detail">
      <div
        className={`
        flex
        items-start
        justify-between
        gap-4
      `}
      >
        <Link
          href="/contacts"
          className={`
            inline-flex
            min-h-11
            items-center
            justify-center
            gap-2
            rounded-xl
            bg-white
            px-4
            py-2.5
            text-sm
            font-medium
            text-slate-700
            shadow-xs
            ring-1
            ring-slate-200
            transition-all
            hover:bg-slate-50
            hover:shadow-xs
            active:scale-[0.98]
            dark:bg-slate-800
            dark:text-slate-300
            dark:ring-slate-700
            dark:hover:bg-slate-700
          `}
        >
          <ChevronLeftIcon size={18} />
          Back
        </Link>
      </div>

      <div
        className={`
        overflow-hidden
        rounded-2xl
        bg-linear-to-br
        from-primary-500
        via-primary-600
        to-primary-700
        p-6
        shadow-xl
        shadow-primary-500/20
        dark:from-primary-600
        dark:via-primary-700
        dark:to-primary-800
      `}
      >
        <div className={`flex items-start gap-4`}>
          <div
            className={`
            flex
            h-16
            w-16
            shrink-0
            items-center
            justify-center
            rounded-2xl
            bg-white/20
            backdrop-blur-xs
            ring-2
            ring-white/30
          `}
          >
            <span className={`text-2xl font-bold text-white`}>{initials}</span>
          </div>
          <div className={`min-w-0 flex-1 pt-1`}>
            <h1
              className={`
              truncate
              text-xl
              font-bold
              text-white
              sm:text-2xl
            `}
            >
              {contactDetails.name ?? contactDetails.email ?? contactId.slice(0, 8)}
            </h1>
            {contactDetails.name && contactDetails.email && (
              <div
                className={`
                mt-2
                flex
                items-center
                gap-2
                text-primary-50
              `}
              >
                <MailIcon size={16} className={`shrink-0`} />
                <p className={`truncate text-sm`}>{contactDetails.email}</p>
              </div>
            )}
            {contactDetails.createdAt && (
              <div
                className={`
                mt-1.5
                flex
                items-center
                gap-2
                text-primary-100
              `}
              >
                <CalendarIcon size={14} className={`shrink-0`} />
                <p className={`text-xs`}>Member since {formatDate(contactDetails.createdAt)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-3 gap-3`}>
        <div
          className={`
          rounded-xl
          bg-white
          p-4
          shadow-xs
          ring-1
          ring-slate-200
          dark:bg-slate-800
          dark:ring-slate-700
        `}
        >
          <div
            className={`
            mb-2
            flex
            items-center
            justify-center
            text-primary-600
            dark:text-primary-400
          `}
          >
            <CurrencyDollarIcon size={28} />
          </div>
          <p
            className={`
            text-center
            text-2xl
            font-bold
            text-slate-900
            dark:text-white
          `}
          >
            {totalPayments}
          </p>
          <p
            className={`
            mt-1
            text-center
            text-xs
            text-slate-600
            dark:text-slate-400
          `}
          >
            Payments
          </p>
        </div>
        <div
          className={`
          rounded-xl
          bg-white
          p-4
          shadow-xs
          ring-1
          ring-slate-200
          dark:bg-slate-800
          dark:ring-slate-700
        `}
        >
          <div
            className={`
            mb-2
            flex
            items-center
            justify-center
            text-green-600
            dark:text-green-400
          `}
          >
            <CheckIcon className={`h-7 w-7`} strokeWidth={2.5} />
          </div>
          <p
            className={`
            text-center
            text-2xl
            font-bold
            text-slate-900
            dark:text-white
          `}
          >
            {completedPayments}
          </p>
          <p
            className={`
            mt-1
            text-center
            text-xs
            text-slate-600
            dark:text-slate-400
          `}
          >
            Completed
          </p>
        </div>
        <div
          className={`
          rounded-xl
          bg-white
          p-4
          shadow-xs
          ring-1
          ring-slate-200
          dark:bg-slate-800
          dark:ring-slate-700
        `}
        >
          <div
            className={`
            mb-2
            flex
            items-center
            justify-center
            text-blue-600
            dark:text-blue-400
          `}
          >
            <DocumentIcon size={28} />
          </div>
          <p
            className={`
            text-center
            text-2xl
            font-bold
            text-slate-900
            dark:text-white
          `}
          >
            {totalDocuments}
          </p>
          <p
            className={`
            mt-1
            text-center
            text-xs
            text-slate-600
            dark:text-slate-400
          `}
          >
            Documents
          </p>
        </div>
      </div>

      <div
        className={`
        rounded-xl
        bg-white
        p-5
        shadow-xs
        ring-1
        ring-slate-200
        dark:bg-slate-800
        dark:ring-slate-700
      `}
      >
        <div
          className={`
          mb-4
          flex
          items-center
          gap-2
        `}
        >
          <div
            className={`
            flex
            h-8
            w-8
            items-center
            justify-center
            rounded-lg
            bg-primary-100
            dark:bg-primary-900/30
          `}
          >
            <UserIcon size={18} className={`text-primary-600 dark:text-primary-400`} />
          </div>
          <h2
            className={`
            text-base
            font-semibold
            text-slate-900
            dark:text-white
          `}
          >
            Contact Information
          </h2>
        </div>
        <dl className={`space-y-3`}>
          {contactDetails.email && (
            <div
              className={`
              flex
              items-start
              gap-3
              rounded-lg
              bg-slate-50
              p-3
              dark:bg-slate-700/30
            `}
            >
              <div
                className={`
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-lg
                bg-blue-100
                dark:bg-blue-900/30
              `}
              >
                <MailIcon size={18} className={`text-blue-600 dark:text-blue-400`} />
              </div>
              <div className={`min-w-0 flex-1 pt-1`}>
                <dt
                  className={`
                  text-xs
                  font-medium
                  text-slate-500
                  dark:text-slate-400
                `}
                >
                  Email Address
                </dt>
                <dd className={`mt-0.5`}>
                  <a
                    href={`mailto:${contactDetails.email}`}
                    className={`
                      truncate
                      text-sm
                      font-medium
                      text-primary-600
                      hover:text-primary-700
                      hover:underline
                      dark:text-primary-400
                      dark:hover:text-primary-300
                    `}
                  >
                    {contactDetails.email}
                  </a>
                </dd>
              </div>
            </div>
          )}
          {formattedAddress && (
            <div
              className={`
              flex
              items-start
              gap-3
              rounded-lg
              bg-slate-50
              p-3
              dark:bg-slate-700/30
            `}
            >
              <div
                className={`
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-lg
                bg-purple-100
                dark:bg-purple-900/30
              `}
              >
                <MapPinIcon
                  className={`
                    h-5
                    w-5
                    text-purple-600
                    dark:text-purple-400
                  `}
                />
              </div>
              <div className={`min-w-0 flex-1 pt-1`}>
                <dt
                  className={`
                  text-xs
                  font-medium
                  text-slate-500
                  dark:text-slate-400
                `}
                >
                  Address
                </dt>
                <dd
                  className={`
                  mt-0.5
                  text-sm
                  font-medium
                  text-slate-900
                  dark:text-white
                `}
                >
                  {formattedAddress}
                </dd>
              </div>
            </div>
          )}
          <div
            className={`
            flex
            items-start
            gap-3
            rounded-lg
            bg-slate-50
            p-3
            dark:bg-slate-700/30
          `}
          >
            <div
              className={`
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-lg
              bg-slate-200
              dark:bg-slate-700
            `}
            >
              <ClipboardCopyIcon size={18} className={`text-slate-600 dark:text-slate-400`} />
            </div>
            <div className={`min-w-0 flex-1 pt-1`}>
              <dt
                className={`
                text-xs
                font-medium
                text-slate-500
                dark:text-slate-400
              `}
              >
                Contact ID
              </dt>
              <dd
                className={`
                mt-0.5
                truncate
                font-mono
                text-xs
                text-slate-700
                dark:text-slate-300
              `}
              >
                {contactDetails.id}
              </dd>
            </div>
          </div>
        </dl>
      </div>

      <div
        className={`
        rounded-xl
        bg-white
        p-5
        shadow-xs
        ring-1
        ring-slate-200
        dark:bg-slate-800
        dark:ring-slate-700
      `}
      >
        <div
          className={`
          mb-4
          flex
          items-center
          justify-between
        `}
        >
          <div className={`flex items-center gap-2`}>
            <div
              className={`
              flex
              h-8
              w-8
              items-center
              justify-center
              rounded-lg
              bg-green-100
              dark:bg-green-900/30
            `}
            >
              <CurrencyDollarIcon size={18} className={`text-green-600 dark:text-green-400`} />
            </div>
            <h2
              className={`
              text-base
              font-semibold
              text-slate-900
              dark:text-white
            `}
            >
              Payment Requests
            </h2>
          </div>
          {totalPayments > 0 && (
            <span
              className={`
              rounded-full
              bg-slate-100
              px-2.5
              py-1
              text-xs
              font-semibold
              text-slate-700
              dark:bg-slate-700
              dark:text-slate-300
            `}
            >
              {totalPayments}
            </span>
          )}
        </div>
        {contactDetails.paymentRequests.length === 0 ? (
          <div
            className={`
            rounded-lg
            bg-slate-50
            p-8
            text-center
            dark:bg-slate-700/30
          `}
          >
            <div
              className={`
              mx-auto
              mb-3
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-full
              bg-slate-200
              dark:bg-slate-700
            `}
            >
              <CurrencyDollarIcon size={24} className={`text-slate-400`} />
            </div>
            <p
              className={`
              text-sm
              font-medium
              text-slate-600
              dark:text-slate-400
            `}
            >
              No payment requests yet
            </p>
            <p
              className={`
              mt-1
              text-xs
              text-slate-500
              dark:text-slate-500
            `}
            >
              Payment history will appear here
            </p>
          </div>
        ) : (
          <div className={`space-y-2`}>
            {contactDetails.paymentRequests.map((pr) => (
              <Link
                key={pr.id}
                href={`/payments/${pr.id}`}
                className={`
                  group
                  block
                  rounded-lg
                  border
                  border-slate-200
                  bg-slate-50/50
                  p-4
                  transition-all
                  hover:border-primary-300
                  hover:bg-primary-50
                  hover:shadow-md
                  active:scale-[0.99]
                  dark:border-slate-700
                  dark:bg-slate-700/20
                  dark:hover:border-primary-700
                  dark:hover:bg-primary-900/10
                `}
              >
                <div
                  className={`
                  flex
                  items-start
                  justify-between
                  gap-3
                `}
                >
                  <div className={`flex-1`}>
                    <div className={`flex items-center gap-2`}>
                      <span
                        className={`
                        text-lg
                        font-bold
                        text-slate-900
                        dark:text-white
                      `}
                      >
                        ${pr.amount}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          pr.status === `completed`
                            ? `bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400`
                            : pr.status === `pending`
                              ? `bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400`
                              : `bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300`
                        }`}
                      >
                        {pr.status}
                      </span>
                    </div>
                    {pr.description && (
                      <p
                        className={`
                        mt-1.5
                        text-sm
                        text-slate-600
                        dark:text-slate-400
                      `}
                      >
                        {pr.description}
                      </p>
                    )}
                    <div
                      className={`
                      mt-2
                      flex
                      items-center
                      gap-1.5
                      text-xs
                      text-slate-500
                      dark:text-slate-500
                    `}
                    >
                      <CalendarIcon size={14} />
                      {formatDate(pr.createdAt)}
                    </div>
                  </div>
                  <div
                    className={`
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-lg
                    bg-white
                    transition-transform
                    group-hover:translate-x-1
                    group-hover:bg-primary-100
                    dark:bg-slate-800
                    dark:group-hover:bg-primary-900/30
                  `}
                  >
                    <ChevronRightIcon
                      size={20}
                      className={`text-slate-400 group-hover:text-primary-600 dark:group-hover:text-primary-400`}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div
        className={`
        rounded-xl
        bg-white
        p-5
        shadow-xs
        ring-1
        ring-slate-200
        dark:bg-slate-800
        dark:ring-slate-700
      `}
      >
        <div
          className={`
          mb-4
          flex
          items-center
          justify-between
        `}
        >
          <div className={`flex items-center gap-2`}>
            <div
              className={`
              flex
              h-8
              w-8
              items-center
              justify-center
              rounded-lg
              bg-blue-100
              dark:bg-blue-900/30
            `}
            >
              <DocumentIcon size={18} className={`text-blue-600 dark:text-blue-400`} />
            </div>
            <h2
              className={`
              text-base
              font-semibold
              text-slate-900
              dark:text-white
            `}
            >
              Documents
            </h2>
          </div>
          {totalDocuments > 0 && (
            <span
              className={`
              rounded-full
              bg-slate-100
              px-2.5
              py-1
              text-xs
              font-semibold
              text-slate-700
              dark:bg-slate-700
              dark:text-slate-300
            `}
            >
              {totalDocuments}
            </span>
          )}
        </div>
        {contactDetails.documents.length === 0 ? (
          <div
            className={`
            rounded-lg
            bg-slate-50
            p-8
            text-center
            dark:bg-slate-700/30
          `}
          >
            <div
              className={`
              mx-auto
              mb-3
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-full
              bg-slate-200
              dark:bg-slate-700
            `}
            >
              <DocumentIcon size={24} className={`text-slate-400`} />
            </div>
            <p
              className={`
              text-sm
              font-medium
              text-slate-600
              dark:text-slate-400
            `}
            >
              No documents yet
            </p>
            <p
              className={`
              mt-1
              text-xs
              text-slate-500
              dark:text-slate-500
            `}
            >
              Uploaded documents will appear here
            </p>
          </div>
        ) : (
          <div className={`space-y-2`}>
            {contactDetails.documents.map((doc) => (
              <div
                key={doc.id}
                className={`
                  group
                  flex
                  items-center
                  justify-between
                  gap-3
                  rounded-lg
                  border
                  border-slate-200
                  bg-slate-50/50
                  p-4
                  transition-all
                  hover:border-blue-300
                  hover:bg-blue-50/50
                  dark:border-slate-700
                  dark:bg-slate-700/20
                  dark:hover:border-blue-700
                  dark:hover:bg-blue-900/10
                `}
              >
                <div className={`flex items-center gap-3`}>
                  <div
                    className={`
                    flex
                    h-12
                    w-12
                    shrink-0
                    items-center
                    justify-center
                    rounded-lg
                    bg-linear-to-br
                    from-blue-100
                    to-blue-200
                    dark:from-blue-900/30
                    dark:to-blue-800/20
                  `}
                  >
                    <DocumentIcon size={22} className={`text-blue-600 dark:text-blue-400`} />
                  </div>
                  <div>
                    <p className={`font-semibold text-slate-900 dark:text-white`}>{doc.name}</p>
                    {doc.createdAt && (
                      <div
                        className={`
                        mt-1
                        flex
                        items-center
                        gap-1.5
                        text-xs
                        text-slate-500
                        dark:text-slate-500
                      `}
                      >
                        <CalendarIcon size={12} />
                        {formatDate(doc.createdAt)}
                      </div>
                    )}
                  </div>
                </div>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`
                    inline-flex
                    min-h-11
                    items-center
                    gap-2
                    rounded-lg
                    bg-linear-to-r
                    from-primary-600
                    to-primary-700
                    px-4
                    py-2
                    text-sm
                    font-semibold
                    text-white
                    shadow-md
                    shadow-primary-500/20
                    transition-all
                    hover:shadow-lg
                    hover:shadow-primary-500/30
                    active:scale-[0.98]
                    dark:from-primary-500
                    dark:to-primary-600
                  `}
                >
                  <DownloadIcon size={16} strokeWidth={2} />
                  Download
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
