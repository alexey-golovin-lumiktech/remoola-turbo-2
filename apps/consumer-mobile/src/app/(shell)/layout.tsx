import { ShellHeader, ShellNav } from '../../shared/ui/ShellNav';

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`
      flex
      h-screen
      flex-col
      overflow-hidden
    `}
      data-testid="consumer-mobile-shell"
    >
      <ShellHeader />
      <main className={`flex-1 overflow-y-auto overflow-x-hidden`}>{children}</main>
      <ShellNav />
    </div>
  );
}
