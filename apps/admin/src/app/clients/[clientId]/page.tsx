import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Badge } from '@remoola/ui/Badge';
import { Card } from '@remoola/ui/Card';

import { getMeSSR } from '../../../lib/server-auth';
import { getClientSSR } from '../../../lib/server-clients';

export default async function ClientPage({ params }: { params: { clientId: string } }) {
  const me = await getMeSSR();
  if (!me?.role || (me.role !== `admin` && me.role !== `superadmin`)) redirect(`/login?next=/`);
  type Client = {
    id: string;
    createdAt: string;
    updatedAt: string;
    email: string;
    name: string;
    role: string;
    status: string;
    phone: string;
    contracts: [];
    payments: [];
  };
  const client = await getClientSSR<Client>((await params).clientId);
  if (!client) redirect(`/clients`);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h1 className="text-2xl font-semibold mb-4">{client.name}</h1>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p>{client.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p>{client.phone ?? `—`}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            {client.status == `Active` ? (
              <Badge label="Active" tone="green" />
            ) : (
              <Badge label="Signature" tone="blue" />
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">Created</p>
            <p>{new Date(client.createdAt).toLocaleString()}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        <Card className="p-4">
          <h2 className="font-medium mb-2">Contracts</h2>
          {client.contracts?.length ? (
            <ul className="list-disc list-inside">
              {client.contracts.map((c: any) => (
                <li key={c.id}>
                  <Link href={`/contracts/${c.id}`} className="text-blue-600 hover:underline">
                    {c.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">No contracts</p>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="font-medium mb-2">Payments</h2>
          {client.payments?.length ? (
            <ul className="list-disc list-inside">
              {client.payments.map((p: any) => (
                <li key={p.id}>
                  <Link href={`/payments/${p.id}`} className="text-blue-600 hover:underline">
                    {p.reference} – {p.amount} {p.currency}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">No payments</p>
          )}
        </Card>
      </div>
    </div>
  );
}
