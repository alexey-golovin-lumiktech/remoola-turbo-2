'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Badge } from '@remoola/ui/Badge';
import { Card } from '@remoola/ui/Card';
import { Progress as ProgressBar } from '@remoola/ui/Progress';

import { getJson } from '../../../lib';

type DashboardDto = {
  balance: string;
  contractsActiveCount: number;
  lastPaymentAgo: string;
  openContracts: { id: string; contractorName: string; rate: string; status: string; lastActivityAgo: string }[];
  quickDocs: { id: string; name: string; type: string; size: string; updated: string; fileUrl?: string }[];
  compliance: { w9Ready: boolean; kycInReview: boolean; bankVerified: boolean };
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardDto>();

  const load = () => {
    getJson<DashboardDto>(`/dashboard`)
      .then(setData)
      .catch(() => {});
  };

  useEffect(() => void load(), []);

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Client Dashboard</h1>
      <p className="mt-1 text-sm text-gray-600">Pay contractors fast and keep everything compliant.</p>

      <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-gray-500">Balance</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{data?.balance ?? `$0.00`}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Contracts</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{data?.contractsActiveCount ?? 0} active</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Last payment</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{data?.lastPaymentAgo ?? `—`}</p>
        </Card>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-600">📄</span>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Create Contract</p>
              <p className="mt-1 text-sm text-gray-600">Spin up an MSA + SoW in minutes.</p>
            </div>
            <Link
              href="/contracts"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
            >
              Create
            </Link>
          </div>
        </Card>
        <Card>
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-green-50 text-green-600">✅</span>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Start Payment</p>
              <p className="mt-1 text-sm text-gray-600">On-contract payment flow.</p>
            </div>
            <a
              href="/payments"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
            >
              Pay
            </a>
          </div>
        </Card>
      </section>

      <section className="mt-6">
        <Card title="Open Contracts">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-gray-500">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Rate</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {data?.openContracts?.map((c) => (
                  <tr key={c.id} className="border-t border-gray-100">
                    <td className="py-3 pr-4 font-medium text-gray-900">{c.contractorName}</td>
                    <td className="py-3 pr-4 text-gray-700">{c.rate}</td>
                    <td className="py-3 pr-4">
                      {c.status == `Active` ? (
                        <Badge label="Active" tone="green" />
                      ) : (
                        <Badge label="Signature" tone="blue" />
                      )}
                    </td>
                    <td className="py-3 text-gray-600">{c.lastActivityAgo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Activity Timeline">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>W-9 pack ready</span>
              <Badge label="7 m" tone="gray" />
            </div>
            <div>KYC in review</div>
            <div>Bank details {data?.compliance?.bankVerified ? `verified` : `pending`}</div>
          </div>
        </Card>
        <Card
          title="Quick Docs"
          actions={
            <Link href="/documents" className="text-sm font-medium text-blue-600 hover:underline">
              View all
            </Link>
          }
        >
          <ul className="space-y-2">
            {data?.quickDocs?.map((d) => (
              <li key={d.id}>
                <a
                  href={d.fileUrl ?? `/documents`}
                  className="flex items-center justify-between rounded-lg px-2 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <span>{d.name}</span>
                  <span className="text-gray-400">↗</span>
                </a>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Tasks">
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-gray-900">Onboarding / Compliance</span>
                <span className="text-gray-500">W-9 pack ready</span>
              </div>
              <ProgressBar value={60} />
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <input type="checkbox" className="h-4 w-4" />
              <span>KYC in review</span>
            </div>
          </div>
        </Card>
        <Card title="Quick Docs">
          <ul className="space-y-2">
            {data?.quickDocs?.map((d) => (
              <li key={d.id} className="flex items-center justify-between text-sm text-gray-700">
                <span>{d.name}</span>
                <a className="rounded-lg border border-gray-200 px-2 py-1 text-xs" href={d.fileUrl ?? `#`}>
                  Open
                </a>
              </li>
            ))}
          </ul>
        </Card>
        <div className="hidden lg:block" />
      </section>
    </>
  );
}
