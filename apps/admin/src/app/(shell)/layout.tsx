import { redirect } from 'next/navigation';

import SearchCommand from './search/SearchCommand';
import Sidebar from './sidebar';
import { getMeSSR } from '../../lib/server-auth';

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const me = await getMeSSR();
  console.log(`ShellLayout me`, me);
  const role = me?.role;
  if (!role || (role != `admin` && role != `superadmin`)) redirect(`/login?next=/`);

  return (
    <div className="mx-auto grid grid-cols-12 gap-6 px-3 py-6 sm:px-6 lg:px-8">
      <aside className="col-span-3 hidden lg:block">
        <Sidebar />
      </aside>

      <main className="col-span-12 lg:col-span-9">
        {/* Top bar */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="relative w-full">
            <SearchCommand />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">⌘K</span>
          </div>
          <a
            href="/login"
            className="grid h-10 w-10 place-items-center round-lg bg-white shadow-sm"
            style={{ border: `1px solid rgba(0,0,0,.06)` }}
          >
            ⎋
          </a>
        </div>

        {children}
      </main>
    </div>
  );
}
