'use client';

import styles from './classNames.module.css';

const { paginationBar, paginationInfo, paginationButton } = styles;

type PaginationBarProps = {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
};

export function PaginationBar({ total, page, pageSize, onPageChange, loading = false }: PaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  if (total === 0 && !loading) return null;

  return (
    <div className={paginationBar} data-testid="pagination-bar">
      <span className={paginationInfo}>
        Showing {from}–{to} of {total}
      </span>
      <button
        type="button"
        className={paginationButton}
        disabled={page <= 1 || loading}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onPageChange(Math.max(1, page - 1));
        }}
      >
        Previous
      </button>
      <span className={paginationInfo}>
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        className={paginationButton}
        disabled={page >= totalPages || loading}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onPageChange(Math.min(totalPages, page + 1));
        }}
      >
        Next
      </button>
    </div>
  );
}
