import { Sidebar, Topbar } from '../../components';
import styles from '../../components/ui/classNames.module.css';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.adminProtectedLayout}>
      <Sidebar />
      <div className={styles.adminProtectedContent}>
        <Topbar />
        <main className={styles.adminProtectedMain}>{children}</main>
      </div>
    </div>
  );
}
