'use client';

import { useEffect, useState } from 'react';

import { JsonView } from '../../../../components';
import { type AdminUser } from '../../../../lib';

export function AdminDetailsPageClient({ adminId }: { adminId: string }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);

  useEffect(() => {
    async function getAdmin(adminId: string): Promise<AdminUser | null> {
      const response = await fetch(`/api/admins/${adminId}`, {
        cache: `no-store`,
        credentials: `include`,
      });
      if (!response.ok) return null;
      return await response.json();
    }

    getAdmin(adminId).then(setAdmin);
  }, [adminId]);

  if (!admin) return <div className="text-sm text-gray-600">Admin not found</div>;

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm text-gray-500">Admin</div>
        <h1 className="text-2xl font-semibold">{admin.email}</h1>
        <div className="mt-1 text-sm text-gray-700">
          <JsonView value={admin} />
        </div>
      </div>
    </div>
  );
}
