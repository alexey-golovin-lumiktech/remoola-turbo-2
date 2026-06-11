'use client';

import { type ComponentProps } from 'react';

import { type DocumentsClientContractContext } from './document-helpers';
import { HelpInlineGuides } from '../../../features/help/ui';
import { shellEmptyState } from '../../../shared/ui/shell-card-tokens';

type HelpGuide = ComponentProps<typeof HelpInlineGuides>[`guides`][number];

export function DocumentsEmptyState({
  contractContext,
  emptyStateHelpGuides,
  hasDocumentsOnAnotherPage,
  onReturnToFirstPage,
}: {
  contractContext: DocumentsClientContractContext | null;
  emptyStateHelpGuides: HelpGuide[];
  hasDocumentsOnAnotherPage: boolean;
  onReturnToFirstPage: () => void;
}) {
  return (
    <div className={shellEmptyState}>
      <div>
        {hasDocumentsOnAnotherPage
          ? contractContext
            ? `No files are visible on this page right now.`
            : `No documents are visible on this page right now.`
          : contractContext
            ? `No files are linked to this contract yet.`
            : `No documents uploaded yet.`}
      </div>
      {hasDocumentsOnAnotherPage ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={onReturnToFirstPage}
            className="rounded-xl border border-(--app-border) px-3 py-2 text-sm text-(--app-text-soft) transition hover:border-(--app-border-strong) hover:text-(--app-text)"
          >
            Go to page 1
          </button>
        </div>
      ) : null}
      <HelpInlineGuides
        guides={emptyStateHelpGuides}
        title={
          hasDocumentsOnAnotherPage
            ? contractContext
              ? `Need help getting back to the first contract files page?`
              : `Need help getting back to the first documents page?`
            : contractContext
              ? `Need help understanding how files reach this contract view?`
              : `Need help uploading the first document or attaching it later?`
        }
        className="mx-auto mt-4 max-w-3xl text-left"
      />
    </div>
  );
}
