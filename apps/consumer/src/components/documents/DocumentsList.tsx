'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@remoola/ui';

import { DocumentPreviewModal } from './DocumentPreviewModal';
import localStyles from './DocumentsList.module.css';
import { formatDateForDisplay } from '../../lib/date-utils';
import { FormSelect, type FormSelectOption, PaginationBar } from '../ui';
import styles from '../ui/classNames.module.css';

const DEFAULT_PAGE_SIZE = 10;

const DOC_KIND_OPTIONS: FormSelectOption[] = [
  { value: ``, label: `All documents` },
  { value: `PAYMENT`, label: `Payments` },
  { value: `COMPLIANCE`, label: `Compliance` },
  { value: `CONTRACT`, label: `Contracts` },
  { value: `GENERAL`, label: `General` },
];

const {
  attachButton,
  bulkActionsRow,
  checkboxBase,
  dangerButtonSm,
  filterRowControlHeight,
  formInputFilterRow,
  hiddenInput,
  linkPrimaryXs,
  tableBodyRow,
  tableCellBodyMd,
  tableCellHeaderMd,
  tableContainer,
  tableEmptyCell,
  tableHeaderRow,
} = styles;

type Doc = {
  id: string;
  name: string;
  size: number;
  createdAt: string;
  downloadUrl: string;
  mimetype: string | null;
  kind: string;
  tags: string[];
};

type PreviewDoc = Doc | null;

export function DocumentsList() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [docs, setDocs] = useState<Doc[]>([]);
  const docsList = Array.isArray(docs) ? docs : [];
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState(``);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<PreviewDoc>(null);
  const [attachPaymentId, setAttachPaymentId] = useState(``);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (kind) params.append(`kind`, kind);

    const res = await fetch(`/api/documents?${params}`, {
      method: `GET`,
      headers: { 'content-type': `application/json` },
      credentials: `include`,
      cache: `no-store`,
    });

    setLoading(false);
    if (!res.ok) return;

    const json = await res.json();
    // Support both paginated { items, total, page, pageSize } and legacy array response
    const items = Array.isArray(json) ? json : (json?.items ?? []);
    const totalCount = Array.isArray(json) ? json.length : Number(json?.total ?? 0);
    setDocs(Array.isArray(items) ? items : []);
    setTotal(totalCount);
    setSelected(new Set());
  }, [kind, page, pageSize]);

  useEffect(() => {
    load();
  }, [load, kind]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === docsList.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(docsList.map((d) => d.id)));
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const form = new FormData();
    Array.from(files).forEach((file) => form.append(`files`, file));
    setUploading(true);

    const res = await fetch(`/api/documents/upload`, {
      method: `POST`,
      credentials: `include`,
      body: form,
    });

    setUploading(false);
    e.target.value = ``;

    if (!res.ok) {
      toast.error(`Upload failed`);
      return;
    }

    setPage(1);
    await load();
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Delete selected documents?`)) return;

    const res = await fetch(`/api/documents/bulk-delete`, {
      method: `POST`,
      headers: { 'content-type': `application/json` },
      credentials: `include`,
      body: JSON.stringify({ ids: Array.from(selected) }),
    });

    if (!res.ok) {
      toast.error(`Failed to delete`);
      return;
    }

    await load();
  }

  async function handleAttachToPayment() {
    if (selected.size === 0 || !attachPaymentId.trim()) {
      toast.error(`Select documents and provide a payment request ID.`);
      return;
    }

    const res = await fetch(`/api/documents/attach-to-payment`, {
      method: `POST`,
      headers: { 'content-type': `application/json` },
      credentials: `include`,
      body: JSON.stringify({
        paymentRequestId: attachPaymentId.trim(),
        resourceIds: Array.from(selected),
      }),
    });

    if (!res.ok) {
      toast.error(`Failed to attach documents`);
      return;
    }

    toast.success(`Attached successfully`);
    setAttachPaymentId(``);
  }

  async function handleTagsChange(docId: string, tagsValue: string) {
    const tags = tagsValue
      .split(`,`)
      .map((t) => t.trim())
      .filter(Boolean);

    const res = await fetch(`/api/documents/${docId}/tags`, {
      method: `POST`,
      headers: { 'content-type': `application/json` },
      credentials: `include`,
      body: JSON.stringify({ tags }),
    });

    if (!res.ok) {
      toast.error(`Failed to update tags`);
      return;
    }

    await load();
  }

  const hasSelected = selected.size > 0;

  return (
    <div className={localStyles.pageRoot}>
      {/* Top actions: upload, filters, bulk actions — align button and select by bottom */}
      <div className={localStyles.toolbar}>
        {/* Upload — fixed 42px height so it aligns with Document type select */}
        <div className={cn(filterRowControlHeight, localStyles.uploadControl)}>
          <label className={localStyles.uploadLabel} style={{ margin: 0 }}>
            {uploading ? `Uploading...` : `Upload documents`}
            <input type="file" multiple className={hiddenInput} onChange={handleUpload} />
          </label>
        </div>

        <div className={localStyles.filterControl}>
          <FormSelect
            label=""
            value={kind}
            onChange={(v) => {
              setKind(v);
              setPage(1);
            }}
            options={DOC_KIND_OPTIONS}
            placeholder="All documents"
            isClearable={false}
          />
        </div>

        {/* Bulk actions */}
        {hasSelected && (
          <div className={cn(bulkActionsRow, localStyles.bulkActions)}>
            <button onClick={handleBulkDelete} className={cn(dangerButtonSm, localStyles.bulkDeleteButton)}>
              Delete selected
            </button>

            <div className={cn(bulkActionsRow, localStyles.attachActions)}>
              <input
                type="text"
                placeholder="Payment request ID"
                className={cn(formInputFilterRow, localStyles.attachInput)}
                value={attachPaymentId}
                onChange={(e) => setAttachPaymentId(e.target.value)}
              />
              <button onClick={handleAttachToPayment} className={cn(attachButton, localStyles.attachSubmitButton)}>
                Attach to payment
              </button>
            </div>
          </div>
        )}
      </div>

      {total > 0 && (
        <PaginationBar
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          loading={loading}
          showPageInfo={false}
        />
      )}

      {/* Table */}
      <div className={localStyles.mobileList}>
        {docsList.length === 0 ? (
          <div className={localStyles.mobileEmptyState}>No documents found</div>
        ) : (
          docsList.map((d) => {
            const checked = selected.has(d.id);
            return (
              <article key={d.id} className={localStyles.mobileCard}>
                <div className={localStyles.mobileCardHeader}>
                  <div className={localStyles.mobileTitleBlock}>
                    <div className={localStyles.mobileTitle}>{d.name}</div>
                    <div className={localStyles.mobileMetaText}>{d.kind}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={checked}
                    className={checkboxBase}
                    onChange={(e) => (e.preventDefault(), e.stopPropagation(), toggleSelect(d.id))}
                  />
                </div>

                <div className={localStyles.mobileMetaGrid}>
                  <div>
                    <div className={localStyles.mobileMetaLabel}>Size</div>
                    <div className={localStyles.mutedBodyCell}>{(d.size / 1024).toFixed(1)} KB</div>
                  </div>
                  <div>
                    <div className={localStyles.mobileMetaLabel}>Uploaded</div>
                    <div className={localStyles.mutedBodyCell}>{formatDateForDisplay(d.createdAt)}</div>
                  </div>
                </div>

                <div className={localStyles.mobileTagsField}>
                  <div className={localStyles.mobileMetaLabel}>Tags</div>
                  <input
                    className={localStyles.mobileTagsInput}
                    defaultValue={d.tags.join(`, `)}
                    onBlur={(e) => handleTagsChange(d.id, e.target.value)}
                    placeholder="comma,separated,tags"
                  />
                </div>

                <div className={localStyles.mobileActions}>
                  <button
                    type="button"
                    className={linkPrimaryXs}
                    onClick={(e) => (e.preventDefault(), e.stopPropagation(), setPreview(d))}
                  >
                    Preview
                  </button>
                  <a href={d.downloadUrl} className={linkPrimaryXs} target="_blank" rel="noreferrer">
                    Download
                  </a>
                </div>
              </article>
            );
          })
        )}
      </div>

      <div className={localStyles.desktopTableWrapper}>
        <div className={tableContainer}>
          <table className={localStyles.table}>
            <thead>
              <tr className={tableHeaderRow}>
                <th className={tableCellHeaderMd}>
                  <input
                    type="checkbox"
                    checked={selected.size === docsList.length && docsList.length > 0}
                    onChange={toggleSelectAll}
                    className={checkboxBase}
                  />
                </th>
                <th className={tableCellHeaderMd}>Name</th>
                <th className={tableCellHeaderMd}>Type</th>
                <th className={tableCellHeaderMd}>Tags</th>
                <th className={tableCellHeaderMd}>Size</th>
                <th className={tableCellHeaderMd}>Uploaded</th>
                <th className={tableCellHeaderMd}></th>
              </tr>
            </thead>

            <tbody>
              {docsList.length === 0 && (
                <tr>
                  <td colSpan={7} className={tableEmptyCell}>
                    No documents found
                  </td>
                </tr>
              )}

              {docsList.map((d) => {
                const checked = selected.has(d.id);
                return (
                  <tr key={d.id} className={tableBodyRow}>
                    <td className={tableCellBodyMd}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => (e.preventDefault(), e.stopPropagation(), toggleSelect(d.id))}
                      />
                    </td>

                    <td className={localStyles.nameCell}>{d.name}</td>

                    <td className={localStyles.mutedBodyCell}>{d.kind}</td>

                    <td className={tableCellBodyMd}>
                      <input
                        className={localStyles.tagsInput}
                        defaultValue={d.tags.join(`, `)}
                        onBlur={(e) => handleTagsChange(d.id, e.target.value)}
                        placeholder="comma,separated,tags"
                      />
                    </td>

                    <td className={localStyles.mutedBodyCell}>{(d.size / 1024).toFixed(1)} KB</td>

                    <td className={localStyles.mutedBodyCell}>{formatDateForDisplay(d.createdAt)}</td>

                    <td className={localStyles.rowActionsCell}>
                      <button
                        type="button"
                        className={linkPrimaryXs}
                        onClick={(e) => (e.preventDefault(), e.stopPropagation(), setPreview(d))}
                      >
                        Preview
                      </button>
                      <a href={d.downloadUrl} className={linkPrimaryXs} target="_blank" rel="noreferrer">
                        Download
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {preview && <DocumentPreviewModal open={preview !== null} doc={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
