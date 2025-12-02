'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import PaymentsFilters from './PaymentsFilters';

type PaymentItem = {
  id: string;
  amount: number;
  currencyCode: string;
  status: string;
  type: string;
  description: string | null;
  createdAt: string;
  counterparty: { id: string; email: string };
  latestTransaction?: {
    id: string;
    status: string;
    createdAt: string;
  };
};

export default function PaymentsList() {
  const [items, setItems] = useState<PaymentItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const [status, setStatus] = useState(``);
  const [type, setType] = useState(``);
  const [search, setSearch] = useState(``);

  useEffect(() => {
    async function load() {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (status) params.append(`status`, status);
      if (type) params.append(`type`, type);
      if (search) params.append(`search`, search);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/payments?${params}`, {
        credentials: `include`,
        headers: { 'Content-Type': `application/json` },
      });

      if (!res.ok) return;

      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
    }

    load();
  }, [page, status, type, search]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <PaymentsFilters
        status={status}
        type={type}
        search={search}
        onStatusChangeAction={setStatus}
        onTypeChangeAction={setType}
        onSearchChangeAction={setSearch}
      />

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b">
              <th className="px-6 py-3">Counterparty</th>
              <th className="px-6 py-3">Amount</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-6 text-center text-slate-500">
                  No payments found
                </td>
              </tr>
            )}

            {items.map((p) => (
              <tr key={p.id} className="border-b hover:bg-slate-50 transition cursor-pointer">
                <td className="px-6 py-4">
                  <div className="font-medium">{p.counterparty.email}</div>
                  <div className="text-xs text-slate-500">{p.description || `—`}</div>
                </td>

                <td className="px-6 py-4 font-semibold">${p.amount.toFixed(2)}</td>

                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      p.status === `PENDING`
                        ? `bg-yellow-100 text-yellow-800`
                        : p.status === `COMPLETED`
                          ? `bg-green-100 text-green-800`
                          : p.status === `WAITING`
                            ? `bg-blue-100 text-blue-800`
                            : `bg-slate-100 text-slate-600`
                    }`}
                  >
                    {p.status}
                  </span>
                </td>

                <td className="px-6 py-4 text-slate-700">{p.type}</td>

                <td className="px-6 py-4 text-slate-600">{new Date(p.createdAt).toLocaleDateString()}</td>

                <td className="px-6 py-4 text-right">
                  <Link href={`/payments/${p.id}`} className="text-blue-600 font-medium hover:underline">
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-end gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 rounded-md bg-white border shadow-sm disabled:opacity-50"
          >
            Previous
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 rounded-md bg-white border shadow-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
