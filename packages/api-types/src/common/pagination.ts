export type PaginationQuery = {
  limit?: number;
  offset?: number;
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};
