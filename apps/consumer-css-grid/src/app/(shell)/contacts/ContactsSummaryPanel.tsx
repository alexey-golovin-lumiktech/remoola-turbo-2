'use client';

import { ActionMini } from '../../../shared/ui/shell-actions';

export function ContactsSummaryPanel({
  contactsLength,
  page,
  searchMode,
  totalContacts,
  totalPages,
  withAddress,
  withEmail,
}: {
  contactsLength: number;
  page: number;
  searchMode: boolean;
  totalContacts: number;
  totalPages: number;
  withAddress: number;
  withEmail: number;
}) {
  return (
    <div className="rounded-[28px] border border-(--app-border) bg-(--app-surface-muted) p-5 backdrop-blur">
      <div className="mb-4 text-lg font-semibold text-(--app-text)">Contact summary</div>
      <div className="space-y-3">
        <ActionMini
          label={
            searchMode
              ? `${contactsLength} matching contacts`
              : `Page ${page} of ${totalPages} · ${contactsLength} shown · ${totalContacts} saved contacts`
          }
        />
        <ActionMini
          label={searchMode ? `Search matches are limited to name and email` : `${withAddress} with address details`}
        />
        <ActionMini
          label={searchMode ? `Clear search to edit or delete from the full list` : `${withEmail} with email available`}
        />
      </div>
    </div>
  );
}
