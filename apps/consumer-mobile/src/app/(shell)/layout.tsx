import styles from './layout.module.css';
import { ShellHeader, ShellNav } from '../../shared/ui/ShellNav';

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell} data-testid="consumer-mobile-shell">
      <ShellHeader />
      <main className={styles.main}>{children}</main>
      <ShellNav />
    </div>
  );
}
