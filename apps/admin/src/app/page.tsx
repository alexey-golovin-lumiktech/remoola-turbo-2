import Link from 'next/link';

import { Badge } from '@remoola/ui/Badge';
import { Card } from '@remoola/ui/Card';
import { Progress } from '@remoola/ui/Progress';

import Shell from './(shell)/layout';

export default async function AdminDashboard() {
  return (
    <Shell>
      <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
      <p className="mt-1 text-sm text-gray-600">Monitor system health, compliance, and activity across tenants.</p>

      {/* Stat cards */}
      <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="muted text-sm">Active Clients</p>
          <p className="stat-number mt-2">128</p>
        </Card>
        <Card>
          <p className="muted text-sm">Contracts</p>
          <p className="stat-number mt-2">1,942</p>
        </Card>
        <Card>
          <p className="muted text-sm">Payments (30d)</p>
          <p className="stat-number mt-2">$482,120</p>
        </Card>
        <Card>
          <p className="muted text-sm">Compliance Flags</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="pill">7 open</span>
            <span className="text-sm text-gray-700">/ 34</span>
          </div>
        </Card>
      </section>

      {/* Actions */}
      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-600">👤</span>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Invite Admin</p>
              <p className="mt-1 text-sm text-gray-600">Create a new admin.</p>
            </div>
            <Link href="/admins" className="btn btn-primary">
              Invite
            </Link>
          </div>
        </Card>
        <Card>
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-green-50 text-green-600">⚙️</span>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Review Flags</p>
              <p className="mt-1 text-sm text-gray-600">Triage open compliance items.</p>
            </div>
            <Link href="/documents" className="btn btn-primary">
              Open
            </Link>
          </div>
        </Card>
      </section>

      {/* Activity + Tasks + Quick Docs */}
      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Activity Timeline">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>User promoted to admin</span>
              <Badge label="2 m" tone="gray" />
            </div>
            <div>Contract signed by Alice W.</div>
            <div>Payment batch #827 queued</div>
            <div>W-9 for Bob K. approved</div>
          </div>
        </Card>
        <Card title="Tasks">
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-gray-900">Compliance Sweep</span>
                <span className="text-gray-500">Due Today</span>
              </div>
              <Progress value={65} />
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <input type="checkbox" className="h-4 w-4" /> <span>Audit last 50 payments</span>
            </div>
          </div>
        </Card>
      </section>
    </Shell>
  );
}
