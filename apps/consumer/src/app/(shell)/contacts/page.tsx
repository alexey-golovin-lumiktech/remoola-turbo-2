import { ContactsPageClient } from '../../../components';
import {
  cardBaseSoftCompact,
  pageStackContainer,
  pageSubtitleGray,
  pageTitleGray,
} from '../../../components/ui/classNames';

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
