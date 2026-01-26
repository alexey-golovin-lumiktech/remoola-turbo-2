'use client';

import Link from 'next/link';

import styles from './ui/classNames.module.css';

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
};

export function DataTable<T>({
  rows,
  columns,
  getRowKeyAction: getRowKeyAction,
  rowHrefAction: rowHrefAction,
}: {
  rows: T[];
  columns: Column<T>[];
  getRowKeyAction: (row: T) => string;
  rowHrefAction?: (row: T) => string;
}) {
  return (
    <div className={styles.adminDataTableWrapper}>
      <table className={styles.adminDataTable}>
        <thead className={styles.adminDataTableHead}>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={`${styles.adminDataTableHeaderCell} ${c.className || ``}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = getRowKeyAction(row);
            const href = rowHrefAction?.(row);

            return href ? (
              <tr key={key} className={styles.adminDataTableRow}>
                {columns.map((c) => (
                  <td key={c.key} className={`${styles.adminDataTableCell} ${c.className || ``}`}>
                    <Link key={key} href={href} className={styles.adminDataTableLink}>
                      {c.render(row)}
                    </Link>
                  </td>
                ))}
              </tr>
            ) : (
              <tr key={key} className={styles.adminDataTableRow}>
                {columns.map((c) => (
                  <td key={c.key} className={`${styles.adminDataTableCell} ${c.className || ``}`}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
