'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const path = usePathname();

  const nav = [
    { label: `Dashboard`, href: `/dashboard` },
    { label: `Contracts`, href: `/contracts` },
    { label: `Payments`, href: `/payments` },
    { label: `Documents`, href: `/documents` },
  ];

  return (
    <aside className="w-60 bg-[#10306f] text-white flex flex-col py-6 px-4">
      <h1 className="text-xl font-semibold mb-8 px-2">Remoola</h1>

      <nav className="flex flex-col gap-1">
        {nav.map((item) => {
          const active = path.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded-md font-medium ${
                active ? `bg-white text-[#10306f]` : `text-white/80 hover:bg-[#ffffff22]`
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-2 text-xs text-white/60">© Remoola 2025</div>
    </aside>
  );
}
