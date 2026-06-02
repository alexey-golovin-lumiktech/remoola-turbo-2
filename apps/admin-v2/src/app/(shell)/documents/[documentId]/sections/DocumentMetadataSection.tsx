import { type DocumentCasePageData } from '../page.loader';

export function DocumentMetadataSection({
  documentCase,
  tags,
}: {
  documentCase: DocumentCasePageData[`documentCase`];
  tags: DocumentCasePageData[`tags`];
}) {
  const tagMetadata = new Map((tags?.items ?? []).map((tag) => [tag.id, tag]));

  return (
    <section className="detailGrid">
      <article className="panel">
        <h2>Visible tags</h2>
        <div className="pillRow">
          {documentCase.tags.length === 0 ? <span className="muted">No tags assigned.</span> : null}
          {documentCase.tags.map((tag) => (
            <span className="pill" key={tag.id}>
              {tag.name}
              {tagMetadata.get(tag.id)?.reserved ? ` (system-managed)` : ``}
            </span>
          ))}
        </div>
      </article>

      <article className="panel">
        <h2>Boundary notes</h2>
        <p className="muted">
          This case shows evidence context only. There is no document review queue, upload console, bucket diagnostics,
          or generic admin patch endpoint in this slice.
        </p>
      </article>
    </section>
  );
}
