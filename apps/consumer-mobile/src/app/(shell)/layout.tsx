import { ShellNav } from '../../shared/ui';

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col pb-16" data-testid="consumer-mobile-shell">
      <ShellNav />
      <main className="flex-1 px-4 py-4">{children}</main>
    </div>
  );
}
