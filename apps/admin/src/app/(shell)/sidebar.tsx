'use client';
import { usePathname } from 'next/navigation';

import { SidebarLink } from '@remoola/ui/SidebarLink';

import { useUser } from '../../context/UserContext';

export default function Sidebar() {
  const user = useUser();
  const path = usePathname();

  return (
    <div className="admin-sidebar h-[calc(100vh-3rem)] p-4 text-white shadow-xl">
      <div className="brand">
        <div className="dot" />
        <span className="text-lg font-bold tracking-tight">Admin</span>
      </div>
      <nav className="mt-6 space-y-1">
        <SidebarLink href="/" active={path == `/`}>
          Dashboard
        </SidebarLink>

        {user?.role === `superadmin` && (
          <SidebarLink href="/admins" active={path.startsWith(`/admins`)}>
            Admins
          </SidebarLink>
        )}

        <SidebarLink href="/clients" active={path.startsWith(`/clients`)}>
          Clients
        </SidebarLink>

        <SidebarLink href="/contractors" active={path.startsWith(`/contractors`)}>
          Contractors
        </SidebarLink>

        <SidebarLink href="/contracts" active={path.startsWith(`/contracts`)}>
          Contracts
        </SidebarLink>

        <SidebarLink href="/payments" active={path.startsWith(`/payments`)}>
          Payments
        </SidebarLink>

        <SidebarLink href="/documents" active={path.startsWith(`/documents`)}>
          Documents
        </SidebarLink>
      </nav>
      <div className="absolute bottom-4 left-4 right-4 text-xs text-white/70">
        © Remoola {new Date().getFullYear()}
      </div>
    </div>
  );
}
