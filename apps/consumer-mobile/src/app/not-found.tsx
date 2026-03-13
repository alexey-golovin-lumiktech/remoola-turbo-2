import Link from 'next/link';

import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Page not found</h1>
      <p className={styles.message}>The page you are looking for does not exist.</p>
      <Link href="/" className={styles.link}>
        Go home
      </Link>
    </div>
  );
}
