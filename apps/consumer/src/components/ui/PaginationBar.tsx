'use client';

import styles from './classNames.module.css';

const { paginationActions, paginationBar, paginationButton, paginationInfo, paginationPageInfo } = styles;

type PaginationBarProps = {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
  showPageInfo?: boolean;
};

export function PaginationBar({
  total,
  page,
  pageSize,
  onPageChange,
  loading = false,
  showPageInfo = true,
}: PaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const previousPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);
  const previousAriaLabel =
    page <= 1 ? `Previous page (current page ${page})` : `Go to previous page, page ${previousPage}`;
  const nextAriaLabel =
    page >= totalPages ? `Next page (current page ${page} of ${totalPages})` : `Go to next page, page ${nextPage}`;

  if (total === 0 && !loading) return null;

  return (
    <div className={paginationBar} data-testid="pagination-bar">
      <span className={paginationInfo}>
        Showing {from}–{to} of {total}
      </span>

      <div className={paginationActions}>
        <button
          type="button"
          className={paginationButton}
          aria-label={previousAriaLabel}
          disabled={page <= 1 || loading}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onPageChange(Math.max(1, page - 1));
          }}
        >
          Previous
        </button>
        <button
          type="button"
          className={paginationButton}
          aria-label={nextAriaLabel}
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

      {showPageInfo && (
        <span className={paginationPageInfo}>
          Page {page} of {totalPages}
        </span>
      )}
    </div>
  );
}
