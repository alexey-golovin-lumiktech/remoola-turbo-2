import { type ReactElement, type ReactNode } from 'react';

export type DenseTableProps = {
  headers: string[];
  children?: ReactNode;
  emptyMessage?: string;
};

export function DenseTable({ headers, children, emptyMessage }: DenseTableProps): ReactElement {
  const isEmpty = !children || (Array.isArray(children) && children.length === 0);
  const message = emptyMessage ?? `No items.`;

  return (
    <div className="overflow-x-auto rounded-card border border-border bg-panel shadow-xs">
      <table className="min-w-full border-separate border-spacing-0 text-sm leading-5">
        <thead className="sticky top-0 z-[1] bg-white/[0.02] text-left text-xs uppercase tracking-wide text-white/45 [&_th]:whitespace-nowrap">
          <tr>
            {headers.map((header) => (
              <th key={header} className="border-b border-border px-3 py-3 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border [&_tr]:transition-colors [&_tr:hover]:bg-white/[0.02] [&_td]:align-top [&_td]:px-3 [&_td]:py-3">
          {isEmpty ? (
            <tr>
              <td colSpan={headers.length} className="text-white/55">
                {message}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}
