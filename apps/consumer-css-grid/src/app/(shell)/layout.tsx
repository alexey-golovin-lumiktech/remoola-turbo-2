import { ShellClientWrapper } from './ShellClientWrapper';
import { ShellBottomNav, ShellSidebar, ShellTopBar } from '../../shared/ui/ShellNav';

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] transition-[background-color,color] duration-200"
      data-testid="consumer-css-grid-shell"
    >
      <ShellSidebar />
      <div className="flex min-h-screen flex-col md:ml-[248px]">
        <ShellTopBar />
        <main className="flex-1 px-4 pb-24 pt-5 md:px-6 md:pb-8 md:pt-6">
          <ShellClientWrapper>{children}</ShellClientWrapper>
        </main>
        <ShellBottomNav />
      </div>
    </div>
  );
}
