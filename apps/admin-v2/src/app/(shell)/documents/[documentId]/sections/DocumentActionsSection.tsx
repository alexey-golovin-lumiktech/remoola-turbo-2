import {
  operatorFormActionsClass,
  operatorFormClass,
  operatorFormFieldsClass,
  operatorFormFullWidthCtaClass,
  operatorFormIntroClass,
  operatorFormPillGroupClass,
  operatorFormSectionClass,
} from '../../../../../components/ui-classes';
import { retagDocumentAction } from '../../../../../lib/admin-mutations/documents.server';
import { type DocumentCasePageData } from '../page.loader';

export function DocumentActionsSection({
  documentCase,
  tags,
  canManage,
}: {
  documentCase: DocumentCasePageData[`documentCase`];
  tags: DocumentCasePageData[`tags`];
  canManage: boolean;
}) {
  if (!canManage) {
    return null;
  }

  const selectedTags = new Set(documentCase.tags.map((tag) => tag.id));

  return (
    <section className="panel">
      <div className="pageHeader">
        <div>
          <h2>Retag document</h2>
          <p className="muted">Exact `document_retag` action only. Reserved invoice tags remain read-only.</p>
        </div>
      </div>

      {documentCase.core.deletedAt ? (
        <p className="muted">Soft-deleted documents stay investigation-only. Retagging is disabled.</p>
      ) : (
        <form action={retagDocumentAction.bind(null, documentCase.id)} className={operatorFormClass}>
          <input type="hidden" name="version" value={String(documentCase.version)} />
          <div className={operatorFormSectionClass}>
            <div className={operatorFormIntroClass}>
              <p className="text-sm font-medium text-white/90">Retag document</p>
              <p className="muted">Reserved tags remain visible but read-only inside the same selection grid.</p>
            </div>
            <div className={operatorFormFieldsClass}>
              <div className={operatorFormPillGroupClass}>
                {(tags?.items ?? []).map((tag) => (
                  <label className="pill" key={tag.id}>
                    <input
                      type="checkbox"
                      name="tagIds"
                      value={tag.id}
                      defaultChecked={selectedTags.has(tag.id)}
                      disabled={tag.reserved}
                    />
                    {tag.name}
                    {tag.reserved ? ` (system-managed)` : ``}
                  </label>
                ))}
              </div>
            </div>
            <div className={operatorFormActionsClass}>
              <button className={`secondaryButton ${operatorFormFullWidthCtaClass}`} type="submit">
                Save tags
              </button>
            </div>
          </div>
        </form>
      )}
    </section>
  );
}
