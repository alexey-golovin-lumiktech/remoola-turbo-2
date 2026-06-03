import { type ConsumerContractItem } from './dto';

export type ContractListRow = {
  id: string;
  name: string;
  email: string;
  lastRequestId: string | null;
  lastStatus: string | null;
  lastActivity: Date | null;
  docs: number | bigint;
  paymentsCount: number | bigint;
  completedPaymentsCount: number | bigint;
  totalCount: number | bigint;
};

export type ContractListCountRow = {
  totalCount: number | bigint;
};

function mapContractListRow(row: ContractListRow): ConsumerContractItem {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    lastRequestId: row.lastRequestId,
    lastStatus: row.lastStatus,
    lastActivity: row.lastActivity,
    docs: Number(row.docs),
    paymentsCount: Number(row.paymentsCount),
    completedPaymentsCount: Number(row.completedPaymentsCount),
  };
}

export function buildContractListPageResult(
  rows: ContractListRow[],
  page: number,
  pageSize: number,
): {
  items: ConsumerContractItem[];
  total: number;
  page: number;
  pageSize: number;
} {
  return {
    items: rows.map(mapContractListRow),
    total: rows.length > 0 ? Number(rows[0].totalCount) : 0,
    page,
    pageSize,
  };
}

export function buildEmptyContractListPageResult(
  countRows: ContractListCountRow[],
  page: number,
  pageSize: number,
): {
  items: ConsumerContractItem[];
  total: number;
  page: number;
  pageSize: number;
} {
  return {
    items: [],
    total: countRows.length > 0 ? Number(countRows[0].totalCount) : 0,
    page,
    pageSize,
  };
}
