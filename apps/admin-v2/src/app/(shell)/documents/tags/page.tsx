import Link from 'next/link';
import { type ReactNode } from 'react';

import { DenseTable } from '../../../../components/dense-table';
import { MobileQueueCard } from '../../../../components/mobile-queue-card';
import { TabletRow } from '../../../../components/tablet-row';
import { WorkspaceLayout } from '../../../../components/workspace-layout';
import { type DocumentTagsResponse, getAdminIdentity, getDocumentTags } from '../../../../lib/admin-api.server';
import {
  createDocumentTagAction,
  deleteDocumentTagAction,
  updateDocumentTagAction,
} from '../../../../lib/admin-mutations.server';

type DocumentTag = DocumentTagsResponse[`items`][number];

function formatDate(value: string | null | undefined): string {
  if (!value) return `-`;
  return new Date(value).toLocaleString();
}

function renderTagActions(tag: DocumentTag, canManage: boolean): ReactNode {
  if (!canManage || tag.reserved) {
    return (
      <p className="muted">
        {tag.reserved ? `Reserved invoice semantics stay outside Documents management.` : `Read-only`}
      </p>
    );
  }
  return (
    <div className="formStack">
      <form action={updateDocumentTagAction.bind(null, tag.id)} className="actionsRow">
        <input type="hidden" name="version" value={String(tag.version)} />
        <input name="name" defaultValue={tag.name} required maxLength={120} />
        <button className="secondaryButton" type="submit">
          Update
        </button>
      </form>
      <form action={deleteDocumentTagAction.bind(null, tag.id)} className="actionsRow">
        <input type="hidden" name="version" value={String(tag.version)} />
        <input type="hidden" name="confirmed" value="false" />
        <label className="field">
          <span>Confirm</span>
          <input type="checkbox" name="confirmed" value="true" required />
        </label>
        <button className="dangerButton" type="submit" name="confirmedSubmit" value="true">
          Delete
        </button>
      </form>
    </div>
  );
}

function TagsMobileCards({
  items,
  canManage,
  selectedTagId,
}: {
  items: DocumentTag[];
  canManage: boolean;
  selectedTagId: string | null;
}) {
  if (items.length === 0) {
    return (
      <div className="readSurface md:hidden" data-view="mobile">
        <div className="panel muted">No document tags are present yet.</div>
      </div>
    );
  }

  return (
    <div className="readSurface md:hidden" data-view="mobile">
      <div className="queueCards">
        {items.map((tag) => (
          <MobileQueueCard
            key={tag.id}
            id={tag.id}
            title={tag.name}
            subtitle={<span className="mono">{tag.id}</span>}
            trailing={<span className="pill">{tag.reserved ? `System-managed` : `Operator-managed`}</span>}
          >
            <div>
              <span className="pill">{tag.usageCount} linked resources</span>
            </div>
            <div>
              <Link href={`/documents?tagId=${encodeURIComponent(tag.id)}`}>Open filtered explorer</Link>
            </div>
            {selectedTagId === tag.id ? <div className="muted">Current filter target</div> : null}
            <div className="muted">Updated: {formatDate(tag.updatedAt)}</div>
            <div className="muted">Created: {formatDate(tag.createdAt)}</div>
            {renderTagActions(tag, canManage)}
          </MobileQueueCard>
        ))}
      </div>
    </div>
  );
}

function TagsTabletRows({
  items,
  canManage,
  selectedTagId,
}: {
  items: DocumentTag[];
  canManage: boolean;
  selectedTagId: string | null;
}) {
  if (items.length === 0) {
    return (
      <div className="readSurface hidden md:block xl:hidden" data-view="tablet">
        <div className="panel muted">No document tags are present yet.</div>
      </div>
    );
  }

  return (
    <div className="readSurface hidden md:block xl:hidden" data-view="tablet">
      <div className="condensedList">
        {items.map((tag) => (
          <TabletRow
            key={tag.id}
            primary={
              <>
                <strong>{tag.name}</strong>
                <div className="muted mono">{tag.id}</div>
              </>
            }
            cells={[
              <div key="usage">
                <span className="pill">{tag.usageCount} linked</span>
                <div>
                  <Link href={`/documents?tagId=${encodeURIComponent(tag.id)}`}>Filter</Link>
                </div>
              </div>,
              <div key="state">
                <span className="pill">{tag.reserved ? `System-managed` : `Operator-managed`}</span>
                {selectedTagId === tag.id ? <div className="muted">Current filter</div> : null}
              </div>,
              <div className="muted" key="dates">
                <div>Updated: {formatDate(tag.updatedAt)}</div>
                <div>Created: {formatDate(tag.createdAt)}</div>
              </div>,
              renderTagActions(tag, canManage),
            ]}
          />
        ))}
      </div>
    </div>
  );
}

function TagsDesktopTable({
  items,
  canManage,
  selectedTagId,
}: {
  items: DocumentTag[];
  canManage: boolean;
  selectedTagId: string | null;
}) {
  return (
    <div className="readSurface hidden xl:block" data-view="desktop">
      <DenseTable headers={[`Tag`, `Usage`, `State`, `Actions`]} emptyMessage="No document tags are present yet.">
        {items.length === 0
          ? null
          : items.map((tag) => (
              <tr key={tag.id}>
                <td>
                  <div className="formStack">
                    <strong>{tag.name}</strong>
                    <span className="muted mono">{tag.id}</span>
                    <span className="muted">Updated: {formatDate(tag.updatedAt)}</span>
                    <span className="muted">Created: {formatDate(tag.createdAt)}</span>
                  </div>
                </td>
                <td>
                  <div className="formStack">
                    <span className="pill">{tag.usageCount} linked resources</span>
                    <Link href={`/documents?tagId=${encodeURIComponent(tag.id)}`}>Open filtered explorer</Link>
                  </div>
                </td>
                <td>
                  <div className="formStack">
                    <span className="pill">{tag.reserved ? `System-managed` : `Operator-managed`}</span>
                    {selectedTagId === tag.id ? <span className="muted">Current filter target</span> : null}
                  </div>
                </td>
                <td>{renderTagActions(tag, canManage)}</td>
              </tr>
            ))}
      </DenseTable>
    </div>
  );
}

export default async function DocumentTagsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const selectedTagId = typeof params.tagId === `string` ? params.tagId : null;
  const [identity, tags] = await Promise.all([getAdminIdentity(), getDocumentTags()]);
  const canManage = identity?.capabilities.includes(`documents.manage`) ?? false;
  const items: DocumentTag[] = tags?.items ?? [];

  return (
    <WorkspaceLayout workspace="documents">
      <>
        <section className="panel pageHeader">
          <div>
            <h1>Document tags</h1>
            <p className="muted">Usage counts come only from verified `resource_tag` associations.</p>
            <p className="muted">Reserved invoice tags are visible for evidence context but remain system-managed.</p>
          </div>
          <div className="actionsRow">
            <Link className="secondaryButton" href="/documents">
              Documents explorer
            </Link>
          </div>
        </section>

        {canManage ? (
          <section className="panel">
            <div className="pageHeader">
              <div>
                <h2>Create tag</h2>
                <p className="muted">Exact `document_tag_create` action only.</p>
              </div>
            </div>
            <form action={createDocumentTagAction} className="actionsRow">
              <input name="name" placeholder="evidence" maxLength={120} required />
              <button className="secondaryButton" type="submit">
                Create tag
              </button>
            </form>
          </section>
        ) : null}

        <section className="panel">
          <div className="pageHeader">
            <div>
              <h2>Tag list</h2>
              <p className="muted">No hidden writes or generic taxonomy admin are exposed here.</p>
            </div>
          </div>
          <TagsMobileCards items={items} canManage={canManage} selectedTagId={selectedTagId} />
          <TagsTabletRows items={items} canManage={canManage} selectedTagId={selectedTagId} />
          <TagsDesktopTable items={items} canManage={canManage} selectedTagId={selectedTagId} />
        </section>
      </>
    </WorkspaceLayout>
  );
}
