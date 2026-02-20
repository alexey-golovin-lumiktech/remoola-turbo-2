export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

/** Page-based pagination (fintech-safe: bounded page size). Used by admin and consumer list endpoints. */
export type PaginatedResponsePage<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
