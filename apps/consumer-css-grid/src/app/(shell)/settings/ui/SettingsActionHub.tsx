'use client';

import Link from 'next/link';

import { BankIcon } from '../../../../shared/ui/icons/BankIcon';
import { DocumentIcon } from '../../../../shared/ui/icons/DocumentIcon';
import { Panel } from '../../../../shared/ui/shell-panel';

export function SettingsActionHub() {
  return (
    <Panel title="Quick links" aside="Action hub">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/banking"
          aria-label={`Payment methods — manage cards and bank accounts`}
          className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-4 transition hover:border-(--app-border-strong) hover:bg-(--app-surface)"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-(--app-primary-soft) text-(--app-primary)">
              <BankIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-(--app-text)">Payment methods</div>
              <div className="mt-1 text-sm leading-6 text-(--app-text-muted)">
                Manage cards and bank accounts used across payouts and payment flows.
              </div>
            </div>
          </div>
        </Link>

        <Link
          href="/documents"
          aria-label={`Documents — view and manage uploaded files`}
          className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-4 transition hover:border-(--app-border-strong) hover:bg-(--app-surface)"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-(--app-primary-soft) text-(--app-primary)">
              <DocumentIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-(--app-text)">Documents</div>
              <div className="mt-1 text-sm leading-6 text-(--app-text-muted)">
                Open uploaded files, review generated docs, and keep compliance items moving.
              </div>
            </div>
          </div>
        </Link>
      </div>
    </Panel>
  );
}
