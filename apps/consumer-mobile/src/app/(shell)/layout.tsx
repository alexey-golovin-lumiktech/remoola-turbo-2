import styles from './layout.module.css';
import { ShellHeader, ShellNav } from '../../shared/ui/ShellNav';
import { ThemeInitializer } from '../../shared/ui/ThemeInitializer';

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell} data-testid="consumer-mobile-shell">
      <ThemeInitializer />
      <ShellHeader />
      <main className={styles.main}>{children}</main>
      <ShellNav />
    </div>
  );
}
