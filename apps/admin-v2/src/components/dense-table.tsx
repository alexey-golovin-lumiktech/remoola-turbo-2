import { type ReactElement, type ReactNode } from 'react';

type DenseTableProps = {
  headers: string[];
  children?: ReactNode;
  emptyMessage?: string;
};

export function DenseTable({ headers, children, emptyMessage }: DenseTableProps): ReactElement {
  const isEmpty = !children || (Array.isArray(children) && children.length === 0);
  const message = emptyMessage ?? `No items.`;

  return (
    <div className="overflow-hidden rounded-card border border-border bg-linear-to-br from-panel via-panel to-white/[0.015] shadow-[0_18px_48px_rgba(2,6,23,0.2)]">
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm leading-5">
          <thead className="sticky top-0 z-[1] bg-white/[0.03] text-left text-xs uppercase tracking-[0.18em] text-white/45 [&_th]:whitespace-nowrap">
            <tr>
              {headers.map((header) => (
                <th key={header} className="border-b border-border px-3 py-3.5 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border [&_tr]:transition-colors [&_tr:hover]:bg-white/[0.025] [&_td]:align-top [&_td]:px-3 [&_td]:py-3.5">
            {isEmpty ? (
              <tr>
                <td colSpan={headers.length} className="px-4 py-6 text-sm leading-6 text-white/58">
                  {message}
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
