'use client';

import { useEffect, useState } from 'react';

import { useFullscreen } from './useFullscreen';
import { useResizable } from './useResizable';

interface Props {
  open: boolean;
  onClose: () => void;
  doc: {
    id: string;
    name: string;
    size: number;
    createdAt: string;
    downloadUrl: string;
    mimetype: string | null;
    kind: string;
    tags: string[];
  };
}

export default function DocumentPreviewModal({ open, onClose, doc }: Props) {
  const { isFullscreen, toggleFullscreen, fullscreenRef } = useFullscreen();

  const { size, startDragging } = useResizable({ minWidth: 400, minHeight: 300, maxWidth: 1600, maxHeight: 1200 });

  const [zoom, setZoom] = useState(1.0);
  const [showThumbnails, setShowThumbnails] = useState(true);

  const ZOOM_STEP = 0.1;

  const isPDF = doc.mimetype! === `application/pdf`;
  const isImage = doc.mimetype!.startsWith(`image/`);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === `Escape`) onClose();
    };
    window.addEventListener(`keydown`, handleEsc);
    return () => window.removeEventListener(`keydown`, handleEsc);
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-2 md:p-6">
      <div
        ref={fullscreenRef}
        className={`relative bg-white rounded-xl shadow-xl overflow-hidden transition-all
          ${isFullscreen ? `w-screen h-screen rounded-none` : ``}
        `}
        style={!isFullscreen ? { width: size.width, height: size.height } : {}}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
          <div>
            <div className="font-semibold">{doc.name}</div>
            <div className="text-xs text-gray-500">
              {doc.mimetype} — {(doc.size / 1024).toFixed(1)} KB
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Thumbnail toggle */}
            <button
              onClick={() => setShowThumbnails((x) => !x)}
              className="px-2 py-1 rounded-md border text-sm hover:bg-gray-100"
            >
              {showThumbnails ? `Hide Thumbs` : `Show Thumbs`}
            </button>

            {/* Zoom controls */}
            {isPDF || isImage ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoom((z) => Math.max(0.4, z - ZOOM_STEP))}
                  className="px-2 py-1 border rounded hover:bg-gray-100"
                >
                  –
                </button>
                <span className="text-sm w-10 text-center">{Math.round(zoom * 100)}%</span>
                <button
                  onClick={() => setZoom((z) => Math.min(3, z + ZOOM_STEP))}
                  className="px-2 py-1 border rounded hover:bg-gray-100"
                >
                  +
                </button>
              </div>
            ) : null}

            {/* Fit to width */}
            <button onClick={() => setZoom(1)} className="px-2 py-1 rounded-md border text-sm hover:bg-gray-100">
              Fit
            </button>

            {/* Download */}
            <a
              href={doc.downloadUrl}
              download={doc.name}
              className="px-2 py-1 rounded-md border text-sm hover:bg-gray-100"
            >
              Download
            </a>

            {/* Print */}
            <button
              onClick={() => window.open(doc.downloadUrl, `_blank`)?.print?.()}
              className="px-2 py-1 rounded-md border text-sm hover:bg-gray-100"
            >
              Print
            </button>

            {/* Fullscreen */}
            <button onClick={toggleFullscreen} className="px-2 py-1 rounded-md border text-sm hover:bg-gray-100">
              {isFullscreen ? `Exit Fullscreen` : `Fullscreen`}
            </button>

            {/* Close */}
            <button onClick={onClose} className="text-xl px-2">
              ×
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex h-[calc(100%-50px)] overflow-hidden bg-gray-100">
          {/* Sidebar thumbnails */}
          {showThumbnails && isPDF && (
            <div className="hidden md:block w-32 border-r overflow-auto bg-gray-200 p-2">
              {/* Placeholder for real thumbnails, can integrate PDF.js */}
              <div className="text-xs text-center text-gray-500">Thumbnails</div>
            </div>
          )}

          {/* Document */}
          <div className="flex-1 overflow-auto flex justify-center items-start p-4">
            {isPDF && (
              <iframe
                src={doc.downloadUrl}
                className="w-full h-full"
                style={{ transform: `scale(${zoom})`, transformOrigin: `top center` }}
              />
            )}

            {isImage && (
              /* eslint-disable @next/next/no-img-element */
              <img
                src={doc.downloadUrl}
                alt={doc.name}
                className="object-contain"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: `top center`,
                  maxWidth: `100%`,
                  maxHeight: `100%`,
                }}
              />
            )}
          </div>
        </div>

        {/* Drag handle */}
        {!isFullscreen && (
          <div
            onMouseDown={startDragging}
            className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize opacity-50 hover:opacity-100"
          >
            <div className="w-full h-full bg-gray-400/40 rounded-tr-md" />
          </div>
        )}
      </div>
    </div>
  );
}
