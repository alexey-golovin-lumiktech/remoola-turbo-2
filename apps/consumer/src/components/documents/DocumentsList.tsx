'use client';

import { useCallback, useEffect, useState } from 'react';

import { DocumentPreviewModal } from './DocumentPreviewModal';

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
    <div className="space-y-6">
      {/* Top actions: upload, filters, bulk actions */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Upload */}
        <label
          className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm
        font-semibold text-white shadow hover:bg-blue-700 dark:hover:bg-blue-500 cursor-pointer"
        >
          {uploading ? `Uploading...` : `Upload documents`}
          <input type="file" multiple className="hidden" onChange={handleUpload} />
        </label>

        {/* Filter */}
        <select className="px-3 py-2 border rounded-md text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">All documents</option>
          <option value="PAYMENT">Payments</option>
          <option value="COMPLIANCE">Compliance</option>
          <option value="CONTRACT">Contracts</option>
          <option value="GENERAL">General</option>
        </select>

        {/* Bulk actions */}
        {hasSelected && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkDelete}
              className="px-3 py-2 rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-xs font-medium text-red-700 dark:text-red-300"
            >
              Delete selected
            </button>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Payment request ID"
                className="px-2 py-1 border rounded-md text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600"
                value={attachPaymentId}
                onChange={(e) => setAttachPaymentId(e.target.value)}
              />
              <button
                onClick={handleAttachToPayment}
                className="px-3 py-2 rounded-md border bg-slate-50 dark:bg-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600"
              >
                Attach to payment
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border dark:border-slate-600">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400">
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selected.size === docs.length && docs.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300 dark:border-slate-600 text-blue-600 dark:text-blue-400"
                />
              </th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Tags</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Uploaded</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>

          <tbody>
            {docs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-6 text-center text-slate-500 dark:text-slate-400">
                  No documents found
                </td>
              </tr>
            )}

            {docs.map((d) => {
              const checked = selected.has(d.id);
              return (
                <tr key={d.id} className="border-b border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                  <td className="px-4 py-4">
                    <input type="checkbox" checked={checked} onChange={() => toggleSelect(d.id)} />
                  </td>

                  <td className="px-4 py-4 font-medium text-gray-900 dark:text-white">{d.name}</td>

                  <td className="px-4 py-4 text-slate-600 dark:text-slate-400">{d.kind}</td>

                  <td className="px-4 py-4">
                    <input
                      className="w-40 px-2 py-1 border rounded-md text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600"
                      defaultValue={d.tags.join(`, `)}
                      onBlur={(e) => handleTagsChange(d.id, e.target.value)}
                      placeholder="comma,separated,tags"
                    />
                  </td>

                  <td className="px-4 py-4 text-slate-600 dark:text-slate-400">{(d.size / 1024).toFixed(1)} KB</td>

                  <td className="px-4 py-4 text-slate-600 dark:text-slate-400">{new Date(d.createdAt).toLocaleDateString()}</td>

                  <td className="px-4 py-4 text-right space-x-2">
                    <button
                      type="button"
                      className="text-blue-600 dark:text-blue-400 text-xs font-medium hover:underline"
                      onClick={() => setPreview(d)}
                    >
                      Preview
                    </button>
                    <a
                      href={d.downloadUrl}
                      className="text-blue-600 dark:text-blue-400 text-xs font-medium hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
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
