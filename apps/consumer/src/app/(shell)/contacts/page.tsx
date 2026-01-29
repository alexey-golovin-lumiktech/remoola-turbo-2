import { ContactsPageClient } from '../../../components';
import styles from '../../../components/ui/classNames.module.css';

const { cardBaseSoftCompact, pageStackContainer, pageSubtitleGray, pageTitleGray } = styles;

export default async function ContactsPage() {
  return (
    <div className={pageStackContainer}>
      <div>
        <h1 className={pageTitleGray}>Contacts</h1>
        <p className={pageSubtitleGray}>Saved contractors and business contacts.</p>
      </div>

      <div className={cardBaseSoftCompact}>
        <ContactsPageClient />
      </div>
    </div>
  );
}
