'use client';

import Image from 'next/image';

type DocumentItem = {
  id: string;
  name: string;
  kind: string;
  createdAt: string;
  size: number;
  downloadUrl: string;
  tags: string[];
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(`en-US`, {
    year: `numeric`,
    month: `short`,
    day: `2-digit`,
  });
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getPreviewType(name: string): `image` | `pdf` | `unsupported` {
  const ext = name.split(`.`).pop()?.toLowerCase() ?? ``;
  if ([`png`, `jpg`, `jpeg`, `gif`, `webp`, `svg`].includes(ext)) return `image`;
  if (ext === `pdf`) return `pdf`;
  return `unsupported`;
}

export function DocumentPreviewPanel({ document, onClose }: { document: DocumentItem; onClose: () => void }) {
  const previewType = getPreviewType(document.name);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a2e] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-white/90">{document.name}</h3>
            <div className="mt-1 flex flex-wrap gap-3 text-xs text-white/50">
              <span>{document.kind}</span>
              <span>{formatFileSize(document.size)}</span>
              <span>{formatDate(document.createdAt)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Close
          </button>
        </div>

        {document.tags.length > 0 ? (
          <div className="flex flex-wrap gap-2 border-b border-white/10 px-6 py-3">
            {document.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/70">
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex-1 overflow-auto p-6">
          {previewType === `image` ? (
            <div className="flex min-h-[60vh] items-center justify-center rounded-2xl border border-white/5 bg-black/20 p-4">
              <div className="relative h-[60vh] w-full">
                <Image
                  loader={({ src }) => src}
                  unoptimized
                  src={document.downloadUrl}
                  alt={document.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 896px"
                  className="rounded-xl object-contain"
                />
              </div>
            </div>
          ) : previewType === `pdf` ? (
            <iframe
              src={document.downloadUrl}
              title={document.name}
              className="h-[60vh] w-full rounded-2xl border border-white/5 bg-white"
            />
          ) : (
            <div className="flex h-[40vh] flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-center text-white/40">
              <p className="mb-4 text-sm">Preview not available for this file type.</p>
              <a
                href={document.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
              >
                Open file
              </a>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-white/10 px-6 py-3">
          <a
            href={document.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10"
          >
            Open in new tab
          </a>
        </div>
      </div>
    </div>
  );
}
