'use client';

import { type ReactNode } from 'react';

import styles from './classNames.module.css';

const { tableBodyRow, tableCellBodyLg, tableCellHeaderLg, tableContainer, tableEmptyCell, tableHeaderRow, textSm } =
  styles;

export interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  emptyMessage?: string;
  containerClassName?: string;
  headerRowClassName?: string;
  bodyRowClassName?: string;
  keyExtractor?: (item: T, index: number) => string;
}

export function DataTable<T>({
  data,
  columns,
  emptyMessage = `No data found.`,
  containerClassName = ``,
  headerRowClassName = tableHeaderRow,
  bodyRowClassName = tableBodyRow,
  keyExtractor = (item, index) => index.toString(),
}: DataTableProps<T>) {
  return (
    <div className={tableContainer}>
      <table className={`w-full ${textSm} ${containerClassName}`}>
        <thead>
          <tr className={headerRowClassName}>
            {columns.map((column) => (
              <th key={column.key} className={column.headerClassName || tableCellHeaderLg}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className={tableEmptyCell}>
                {emptyMessage}
              </td>
            </tr>
          )}

          {data.map((item, index) => (
            <tr key={keyExtractor(item, index)} className={bodyRowClassName}>
              {columns.map((column) => (
                <td key={column.key} className={column.className || tableCellBodyLg}>
                  {column.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
