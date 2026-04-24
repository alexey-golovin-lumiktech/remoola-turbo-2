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
    <div className="overflow-x-auto rounded-card border border-border bg-panel">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-white/45">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-3 py-2 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {isEmpty ? (
            <tr>
              <td colSpan={headers.length} className="px-3 py-3 text-white/55">
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
