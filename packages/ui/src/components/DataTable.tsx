import React from 'react';

export type Column<T> = {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
};

export function DataTable<T>({
  rows,
  columns,
  rowKey
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T, idx: number) => string;
}) {
  return (
    <div className="rm-tablewrap">
      <table className="rm-table text-left text-sm">
        <thead>
          <tr className="text-gray-500">
            {columns.map((c) => (
              <th key={String(c.key)} className={c.className || ``}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={rowKey(r, i)}>
              {columns.map((c) => (
                <td key={String(c.key)} className={(c as never)[`tdClassName`] || ``}>
                  {c.render ? c.render(r) : (r as never)[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
