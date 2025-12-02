'use client';

import { useEffect, useState } from 'react';

export function PaymentView({ paymentRequestId }: { paymentRequestId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/payments/${paymentRequestId}`, {
        method: `GET`,
        credentials: `include`,
        cache: `no-cache`,
      });

      if (!res.ok) {
        setLoading(false);
        return;
      }

      const json = await res.json();
      setData(json);
      setLoading(false);
    }

    load();
  }, [paymentRequestId]);

  async function payNow() {
    const res = await fetch(`/api/stripe/${paymentRequestId}/stripe-session`, {
      method: `POST`,
      credentials: `include`,
    });

    const json = await res.json();

    if (json.url) {
      window.location.href = json.url;
    } else {
      alert(`Cannot start payment`);
    }
  }

  if (loading) {
    return <div className="p-8 text-slate-600">Loading payment…</div>;
  }

  if (!data) {
    return (
      <div className="p-8">
        <div className="text-red-600">Payment not found</div>
      </div>
    );
  }

  const p = data;

  return (
    <div className="px-8 py-6 flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-slate-900">Payment #{p.id.slice(0, 6).toUpperCase()}</h1>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Side: Details */}
        <div className="col-span-2 flex flex-col gap-6">
          {/* Summary Card */}
          <div className="p-6 rounded-2xl bg-white shadow-sm border">
            <div className="flex justify-between mb-4">
              <div className="text-xl font-semibold">
                ${p.amount.toFixed(2)} {p.currencyCode}
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  p.status === `PENDING`
                    ? `bg-yellow-100 text-yellow-800`
                    : p.status === `COMPLETED`
                      ? `bg-green-100 text-green-800`
                      : `bg-gray-100 text-gray-600`
                }`}
              >
                {p.status}
              </span>
            </div>

            <div className="text-sm text-slate-600">{p.description || `No description`}</div>

            <div className="mt-4 text-xs text-slate-500">Created: {new Date(p.createdAt).toLocaleString()}</div>
          </div>

          {/* Timeline */}
          <div className="p-6 rounded-2xl bg-white shadow-sm border">
            <h2 className="font-semibold mb-3">Timeline</h2>

            {p.transactions.map((t: any) => (
              <div key={t.id} className="border-l pl-4 ml-2 mb-4 relative">
                <div className="absolute w-3 h-3 bg-blue-600 rounded-full -left-1 top-1"></div>

                <div className="text-sm font-semibold">
                  {t.status} ({t.type})
                </div>
                <div className="text-xs text-slate-600">{new Date(t.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Attachments */}
        <div className="col-span-1 flex flex-col gap-6">
          <div className="p-6 rounded-2xl bg-white shadow-sm border">
            <h2 className="font-semibold mb-3">Attachments</h2>

            {p.attachments.length === 0 && <div className="text-sm text-slate-500">No attachments</div>}

            {p.attachments.map((a: any) => (
              <div key={a.id} className="flex justify-between items-center border-b py-2">
                <div>
                  <div className="text-sm">{a.name}</div>
                  <div className="text-xs text-slate-500">{(a.size / 1024).toFixed(1)} KB</div>
                </div>
                <a
                  href={a.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 text-sm font-medium"
                >
                  Download
                </a>
              </div>
            ))}
          </div>

          {/* Action Button */}
          {p.status === `PENDING` && (
            <button
              className="rounded-full bg-blue-600 px-6 py-3 text-sm text-white shadow hover:bg-blue-700"
              onClick={payNow}
            >
              Pay Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
