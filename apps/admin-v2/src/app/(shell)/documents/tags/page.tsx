import Link from 'next/link';

import { getAdminIdentity, getDocumentTags } from '../../../../lib/admin-api.server';
import {
  createDocumentTagAction,
  deleteDocumentTagAction,
  updateDocumentTagAction,
} from '../../../../lib/admin-mutations.server';

function formatDate(value: string | null | undefined): string {
  if (!value) return `-`;
  return new Date(value).toLocaleString();
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

  return (
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

        {tags?.items?.length ? (
          <div className="tableShell">
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Tag</th>
                  <th>Usage</th>
                  <th>State</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tags.items.map((tag) => (
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
                    <td>
                      {canManage && !tag.reserved ? (
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
                      ) : (
                        <p className="muted">
                          {tag.reserved ? `Reserved invoice semantics stay outside Documents management.` : `Read-only`}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No document tags are present yet.</p>
        )}
      </section>
    </>
  );
}
