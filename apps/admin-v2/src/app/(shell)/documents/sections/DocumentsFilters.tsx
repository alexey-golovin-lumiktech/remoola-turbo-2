import { ActionGhost } from '../../../../components/action-ghost';
import { ResponsiveFilterPanel } from '../../../../components/responsive-filter-panel';
import {
  buttonRowClass,
  checkboxFieldClass,
  checkboxInputClass,
  fieldClass,
  fieldLabelClass,
  textInputClass,
} from '../../../../components/ui-classes';
import { type DocumentsPageRawParams } from '../page.params';

export function DocumentsFilters({
  raw,
  activeFilterCount,
  includeDeleted,
}: {
  raw: DocumentsPageRawParams;
  activeFilterCount: number;
  includeDeleted: boolean;
}) {
  return (
    <ResponsiveFilterPanel
      className="order-3"
      title="Explorer filters"
      description="Narrow the evidence explorer by owner, payment linkage, tag, access, size, or time window."
      summaryLabel="Filters"
      summaryValue={`${activeFilterCount} active`}
      activeCount={activeFilterCount}
    >
      <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" method="get">
        <label className={fieldClass}>
          <span className={fieldLabelClass}>Search</span>
          <input
            className={textInputClass}
            name="q"
            defaultValue={typeof raw.q === `string` ? raw.q : ``}
            placeholder="Name or id"
          />
        </label>
        <label className={fieldClass}>
          <span className={fieldLabelClass}>Owner consumer</span>
          <input
            className={textInputClass}
            name="consumerId"
            defaultValue={typeof raw.consumerId === `string` ? raw.consumerId : ``}
            placeholder="Owner consumer id"
          />
        </label>
        <label className={fieldClass}>
          <span className={fieldLabelClass}>Payment request</span>
          <input
            className={textInputClass}
            name="paymentRequestId"
            defaultValue={typeof raw.paymentRequestId === `string` ? raw.paymentRequestId : ``}
            placeholder="Payment request id"
          />
        </label>
        <label className={fieldClass}>
          <span className={fieldLabelClass}>Tag</span>
          <input
            className={textInputClass}
            name="tag"
            defaultValue={typeof raw.tag === `string` ? raw.tag : ``}
            placeholder="Tag name"
          />
        </label>
        <label className={fieldClass}>
          <span className={fieldLabelClass}>Access</span>
          <select
            className={textInputClass}
            name="access"
            defaultValue={typeof raw.access === `string` ? raw.access : ``}
          >
            <option value="">Any access</option>
            <option value="PRIVATE">PRIVATE</option>
            <option value="PUBLIC">PUBLIC</option>
          </select>
        </label>
        <label className={fieldClass}>
          <span className={fieldLabelClass}>MIME type</span>
          <input
            className={textInputClass}
            name="mimetype"
            defaultValue={typeof raw.mimetype === `string` ? raw.mimetype : ``}
            placeholder="MIME type"
          />
        </label>
        <label className={fieldClass}>
          <span className={fieldLabelClass}>Minimum bytes</span>
          <input
            className={textInputClass}
            name="sizeMin"
            type="number"
            min="0"
            defaultValue={typeof raw.sizeMin === `string` ? raw.sizeMin : ``}
            placeholder="Min bytes"
          />
        </label>
        <label className={fieldClass}>
          <span className={fieldLabelClass}>Maximum bytes</span>
          <input
            className={textInputClass}
            name="sizeMax"
            type="number"
            min="0"
            defaultValue={typeof raw.sizeMax === `string` ? raw.sizeMax : ``}
            placeholder="Max bytes"
          />
        </label>
        <label className={fieldClass}>
          <span className={fieldLabelClass}>Created from</span>
          <input
            className={textInputClass}
            name="createdFrom"
            type="datetime-local"
            defaultValue={typeof raw.createdFrom === `string` ? raw.createdFrom.slice(0, 16) : ``}
          />
        </label>
        <label className={fieldClass}>
          <span className={fieldLabelClass}>Created to</span>
          <input
            className={textInputClass}
            name="createdTo"
            type="datetime-local"
            defaultValue={typeof raw.createdTo === `string` ? raw.createdTo.slice(0, 16) : ``}
          />
        </label>
        <div className="flex flex-col justify-end gap-3 xl:col-span-2">
          <label className={checkboxFieldClass}>
            <input
              className={checkboxInputClass}
              type="checkbox"
              name="includeDeleted"
              value="true"
              defaultChecked={includeDeleted}
            />
            <span>Include deleted</span>
          </label>
          <div className={buttonRowClass}>
            <ActionGhost type="submit">Apply filters</ActionGhost>
            <ActionGhost href="/documents">Reset</ActionGhost>
          </div>
        </div>
      </form>
    </ResponsiveFilterPanel>
  );
}
