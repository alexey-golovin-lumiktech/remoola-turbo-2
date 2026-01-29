'use client';

import { useCallback, useEffect, useState } from 'react';

import { DocumentPreviewModal } from './DocumentPreviewModal';
import styles from '../ui/classNames.module.css';

const {
  attachButton,
  bulkActionsRow,
  checkboxBase,
  dangerButtonSm,
  flexWrapItemsCenterGap4,
  formInputBase,
  formInputSmall,
  hiddenInput,
  inlineFlexItemsCenterGap2,
  linkPrimaryXs,
  spaceX2,
  spaceY6,
  tableBodyRow,
  tableCellBodyMd,
  tableCellHeaderMd,
  tableContainer,
  tableEmptyCell,
  tableHeaderRow,
  textMuted,
  textPrimary,
  textRight,
  textSm,
  uploadButtonPrimary,
  width40,
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
  const [docs, setDocs] = useState<Doc[]>([]);
  const [kind, setKind] = useState(``);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<PreviewDoc>(null);
  const [attachPaymentId, setAttachPaymentId] = useState(``);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (kind) params.append(`kind`, kind);

    const res = await fetch(`/api/documents?${params}`, {
      method: `GET`,
      headers: { 'content-type': `application/json` },
      credentials: `include`,
      cache: `no-store`,
    });

    if (!res.ok) return;

    setDocs(await res.json());
    setSelected(new Set());
  }, [kind]);

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
    if (selected.size === docs.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(docs.map((d) => d.id)));
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
      alert(`Upload failed`);
      return;
    }

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
      alert(`Failed to delete`);
      return;
    }

    await load();
  }

  async function handleAttachToPayment() {
    if (selected.size === 0 || !attachPaymentId.trim()) {
      alert(`Select documents and provide a payment request ID.`);
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
      alert(`Failed to attach documents`);
      return;
    }

    alert(`Attached successfully`);
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
      alert(`Failed to update tags`);
      return;
    }

    await load();
  }

  const hasSelected = selected.size > 0;

  return (
    <div className={spaceY6}>
      {/* Top actions: upload, filters, bulk actions */}
      <div className={flexWrapItemsCenterGap4}>
        {/* Upload */}
        <label className={`${inlineFlexItemsCenterGap2} ${uploadButtonPrimary}`}>
          {uploading ? `Uploading...` : `Upload documents`}
          <input type="file" multiple className={hiddenInput} onChange={handleUpload} />
        </label>

        {/* Filter */}
        <select className={formInputBase} value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">All documents</option>
          <option value="PAYMENT">Payments</option>
          <option value="COMPLIANCE">Compliance</option>
          <option value="CONTRACT">Contracts</option>
          <option value="GENERAL">General</option>
        </select>

        {/* Bulk actions */}
        {hasSelected && (
          <div className={bulkActionsRow}>
            <button onClick={handleBulkDelete} className={dangerButtonSm}>
              Delete selected
            </button>

            <div className={bulkActionsRow}>
              <input
                type="text"
                placeholder="Payment request ID"
                className={formInputSmall}
                value={attachPaymentId}
                onChange={(e) => setAttachPaymentId(e.target.value)}
              />
              <button onClick={handleAttachToPayment} className={attachButton}>
                Attach to payment
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className={tableContainer}>
        <table className={`w-full ${textSm}`}>
          <thead>
            <tr className={tableHeaderRow}>
              <th className={tableCellHeaderMd}>
                <input
                  type="checkbox"
                  checked={selected.size === docs.length && docs.length > 0}
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
            {docs.length === 0 && (
              <tr>
                <td colSpan={7} className={tableEmptyCell}>
                  No documents found
                </td>
              </tr>
            )}

            {docs.map((d) => {
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

                  <td className={`${tableCellBodyMd} font-medium ${textPrimary}`}>{d.name}</td>

                  <td className={`${tableCellBodyMd} ${textMuted}`}>{d.kind}</td>

                  <td className={tableCellBodyMd}>
                    <input
                      className={`${formInputSmall} ${width40}`}
                      defaultValue={d.tags.join(`, `)}
                      onBlur={(e) => handleTagsChange(d.id, e.target.value)}
                      placeholder="comma,separated,tags"
                    />
                  </td>

                  <td className={`${tableCellBodyMd} ${textMuted}`}>{(d.size / 1024).toFixed(1)} KB</td>

                  <td className={`${tableCellBodyMd} ${textMuted}`}>{new Date(d.createdAt).toLocaleDateString()}</td>

                  <td className={`${tableCellBodyMd} ${textRight} ${spaceX2}`}>
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

      {preview && <DocumentPreviewModal open={preview !== null} doc={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
