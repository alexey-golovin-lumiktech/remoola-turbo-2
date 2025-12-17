'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { type ConsumerContactDetails } from '../../types';

type ContactDetailsViewProps = { id: ConsumerContactDetails[`id`] };

export function ContactDetailsView({ id }: ContactDetailsViewProps) {
  const [details, setDetails] = useState<ConsumerContactDetails>();

  async function loadDetails(contactId: string) {
    const res = await fetch(`/api/contacts/${contactId}/details`, {
      method: `GET`,
      headers: { 'content-type': `application/json` },
      credentials: `include`,
      cache: `no-store`,
    });
    if (!res.ok) throw new Error(`Failed to load contact`);
    const json = await res.json();
    setDetails(json);
  }

  useEffect(() => void loadDetails(id), [id]);
  if (!details) return null;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{details.name ?? details.email}</h1>
        <p className="text-gray-600">{details.email}</p>
      </div>

      {/* Contact address */}
      <div className="rounded-xl bg-white p-4 shadow">
        <h2 className="font-semibold mb-2">Address</h2>
        <pre className="text-sm text-gray-700">{JSON.stringify(details.address, null, 2)}</pre>
      </div>

      {/* Payment Requests */}
      <div className="rounded-xl bg-white p-4 shadow">
        <h2 className="font-semibold mb-4">Payment Requests</h2>

        <div className="space-y-2">
          {details.paymentRequests.map((pr) => (
            <Link key={pr.id} href={`/payments/${pr.id}`} className="block border px-4 py-2 rounded hover:bg-gray-50">
              <div className="font-medium">
                ${pr.amount} — {pr.status}
              </div>
              <div className="text-xs text-gray-500">{new Date(pr.createdAt).toLocaleString()}</div>
            </Link>
          ))}

          {details.paymentRequests.length === 0 && <div className="text-gray-400">No payment requests</div>}
        </div>
      </div>

      {/* Documents */}
      <div className="rounded-xl bg-white p-4 shadow">
        <h2 className="font-semibold mb-4">Documents</h2>

        <div className="grid grid-cols-2 gap-4">
          {details.documents.map((doc) => (
            <div key={doc.id} className="border rounded p-3 bg-gray-50">
              <div className="font-medium">{doc.name}</div>
              <a href={doc.url} target="_blank" className="text-blue-600 text-sm underline" rel="noreferrer">
                Download
              </a>
            </div>
          ))}

          {details.documents.length === 0 && <div className="text-gray-400">No documents</div>}
        </div>
      </div>
    </div>
  );
}
