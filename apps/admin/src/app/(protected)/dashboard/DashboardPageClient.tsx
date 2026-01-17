export function DashboardPageClient() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-gray-600">
          Next: totals by status, last 24h payment requests, ledger anomalies, verification queues.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm text-gray-500">Consumers</div>
          <div className="mt-1 text-2xl font-semibold">—</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm text-gray-500">Payment Requests</div>
          <div className="mt-1 text-2xl font-semibold">—</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm text-gray-500">Ledger Entries</div>
          <div className="mt-1 text-2xl font-semibold">—</div>
        </div>
      </div>
    </div>
  );
}
