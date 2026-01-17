'use client';

import Link from 'next/link';

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
    <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="min-w-full text-sm">
        <thead className="border-b bg-gray-50">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-4 py-3 text-left text-xs font-semibold text-gray-700 ` + (c.className || ``)}
              >
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
              <tr key={key} className="border-b last:border-b-0 hover:bg-gray-50">
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 py-3 align-top ` + (c.className || ``)}>
                    <Link key={key} href={href} className="contents">
                      {c.render(row)}
                    </Link>
                  </td>
                ))}
              </tr>
            ) : (
              <tr key={key} className="border-b last:border-b-0 hover:bg-gray-50">
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 py-3 align-top ` + (c.className || ``)}>
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
