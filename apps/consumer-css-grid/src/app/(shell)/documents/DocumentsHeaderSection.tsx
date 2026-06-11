'use client';

import Link from 'next/link';
import { type ComponentProps } from 'react';

import { type DocumentsClientContractContext } from './document-helpers';
import { HelpContextualGuides } from '../../../features/help/ui';

type HelpGuide = ComponentProps<typeof HelpContextualGuides>[`guides`][number];

export function DocumentsHeaderSection({
  contractContext,
  documentsHelpGuides,
  documentsLength,
  page,
  total,
  totalPages,
}: {
  contractContext: DocumentsClientContractContext | null;
  documentsHelpGuides: HelpGuide[];
  documentsLength: number;
  page: number;
  total: number;
  totalPages: number;
}) {
  return (
    <>
      {contractContext ? (
        <div className="mb-4 rounded-2xl border border-(--app-primary-soft) bg-(--app-primary-soft) px-4 py-4 text-sm text-(--app-primary)">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-medium text-blue-50">Contract files mode</div>
              <div className="mt-1 text-blue-100/80">
                Showing relationship files for {contractContext.name} ({contractContext.email}).
              </div>
            </div>
            <Link
              href={contractContext.returnTo}
              className="rounded-xl border border-blue-300/20 px-3 py-2 text-sm text-(--app-primary) transition hover:bg-(--app-primary-soft)"
            >
              Back to contract
            </Link>
          </div>
        </div>
      ) : null}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-(--app-text)">
            {contractContext ? `Relationship files` : `Document library`}
          </div>
          <div className="mt-1 text-sm text-(--app-text-muted)">
            {contractContext
              ? `Preview, tag, and attach files already connected to this contract. Page ${page} of ${totalPages} shows ${documentsLength} of ${total} files.`
              : `Upload new files or remove outdated ones. Page ${page} of ${totalPages} shows ${documentsLength} of ${total} documents.`}
          </div>
        </div>
      </div>
      <HelpContextualGuides
        guides={documentsHelpGuides}
        compact
        className="mb-4"
        title={contractContext ? `Need help using contract-linked files?` : `Need help managing documents?`}
        description={
          contractContext
            ? `These guides explain how contract-linked files, document uploads, and payment attachments fit together without leaving this route family.`
            : `These guides explain uploads, attachments, and the delete restrictions that appear once a file becomes part of a payment flow.`
        }
      />
    </>
  );
}
