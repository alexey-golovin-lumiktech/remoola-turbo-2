'use client';

import { useRouter } from 'next/navigation';

import { ACCOUNT_TYPE } from '@remoola/api-types';

import { AddressDetailsForm } from './AddressDetailsForm';
import { OrganizationDetailsForm } from './OrganizationDetailsForm';
import { PasswordChangeForm } from './PasswordChangeForm';
import { PersonalDetailsForm } from './PersonalDetailsForm';
import { PreferredCurrencyForm } from './PreferredCurrencyForm';
import { ThemeSettingsForm } from './ThemeSettingsForm';
import { IconBadge } from '../../../shared/ui/IconBadge';
import { AlertTriangleIcon } from '../../../shared/ui/icons/AlertTriangleIcon';
import { CreditCardIcon } from '../../../shared/ui/icons/CreditCardIcon';
import { DocumentIcon } from '../../../shared/ui/icons/DocumentIcon';
import { LinkIcon } from '../../../shared/ui/icons/LinkIcon';
import { SettingsIcon } from '../../../shared/ui/icons/SettingsIcon';
import { NavCard } from '../../../shared/ui/NavCard';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { VerificationCard } from '../../verification/ui/VerificationCard';
import { type LoadState } from '../queries';
import { type Profile, type Settings } from '../schemas';
import styles from './SettingsView.module.css';

interface SettingsViewProps {
  loadState: LoadState;
  profile: Profile | null;
  settings: Settings | null;
}

export function SettingsView({ loadState, profile, settings }: SettingsViewProps) {
  const router = useRouter();

  if (loadState === `loading`) {
    return (
      <div className={styles.root} data-testid="consumer-mobile-settings-view">
        <div className={styles.headerBar}>
          <div className={styles.headerInner}>
            <div className={styles.headerRow}>
              <div className={styles.headerIconWrap}>
                <SettingsIcon className={styles.headerIcon} />
              </div>
              <div>
                <div className={styles.titleBar} />
                <div className={styles.subtitleBar} />
              </div>
            </div>
          </div>
        </div>
        <div className={styles.main}>
          <div className={styles.blockLg} />
          <div className={styles.blockMd} />
          <div className={styles.blockSm} />
        </div>
      </div>
    );
  }

  if (loadState === `unauthorized`) {
    return (
      <div className={styles.root} data-testid="consumer-mobile-settings-view" data-state={`unauthorized`}>
        <PageHeader
          icon={<IconBadge icon={<SettingsIcon className={styles.headerIcon} />} hasRing />}
          title={`Settings`}
          subtitle={`Session expired. Redirecting…`}
        />
      </div>
    );
  }

  if (loadState === `error`) {
    return (
      <div className={styles.root} data-testid="consumer-mobile-settings-view" data-state={`error`}>
        <PageHeader
          icon={<IconBadge icon={<SettingsIcon className={styles.headerIcon} />} hasRing />}
          title={`Settings`}
          subtitle={`Something went wrong`}
        />
        <div className={styles.errorMain}>
          <div className={styles.errorCard}>
            <div className={styles.errorIconWrap}>
              <AlertTriangleIcon className={styles.errorIcon} strokeWidth={1.5} />
            </div>
            <h3 className={styles.errorTitle}>Unable to load profile</h3>
            <p className={styles.errorText}>Please try again. If the problem persists, contact support.</p>
            <button
              type="button"
              className={styles.retryButton}
              onClick={() => router.refresh()}
              data-testid="settings-error-retry"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loadState !== `ready` || !profile) {
    return (
      <div className={styles.root} data-testid="consumer-mobile-settings-view">
        <div className={styles.headerBar}>
          <div className={styles.headerInner}>
            <div className={styles.headerRow}>
              <div className={styles.headerIconWrap}>
                <SettingsIcon className={styles.headerIcon} />
              </div>
              <div>
                <div className={styles.titleBar} />
                <div className={styles.subtitleBar} />
              </div>
            </div>
          </div>
        </div>
        <div className={styles.main}>
          <div className={styles.blockLg} />
          <div className={styles.blockMd} />
        </div>
      </div>
    );
  }

  const isBusiness = profile.accountType === ACCOUNT_TYPE.BUSINESS;

  return (
    <div className={styles.root} data-testid="consumer-mobile-settings-view" data-state={`ready`}>
      <div className={styles.headerBar}>
        <div className={styles.headerInner}>
          <div className={styles.headerRow}>
            <div className={styles.headerIconWrap}>
              <SettingsIcon className={styles.headerIcon} />
            </div>
            <div>
              <h1 className={styles.headerTitle}>Settings</h1>
              <p className={styles.headerSubtitle}>Manage your profile, preferences, and account settings</p>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.main}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderRow}>
              <div className={styles.cardHeaderIconWrap}>
                <LinkIcon className={styles.cardHeaderIcon} />
              </div>
              <div>
                <h2 className={styles.cardHeaderTitle}>Quick Links</h2>
                <p className={styles.cardHeaderSub}>Manage your payment methods and documents</p>
              </div>
            </div>
          </div>
          <div className={styles.cardList}>
            <NavCard
              href="/payment-methods"
              icon={<CreditCardIcon className={styles.navCardIcon} />}
              title="Payment Methods"
              subtitle="Manage cards and bank accounts"
            />
            <NavCard
              href="/documents"
              icon={<DocumentIcon className={styles.docIcon} />}
              title="Documents"
              subtitle="View and manage your documents"
              iconContainerClassName={styles.docIconWrap}
            />
          </div>
        </div>

        <VerificationCard verification={profile.verification} context="settings" />

        <ThemeSettingsForm initialTheme={settings?.theme ?? undefined} />

        <PreferredCurrencyForm initialCurrency={settings?.preferredCurrency ?? null} />

        <PersonalDetailsForm profile={profile} />

        <AddressDetailsForm profile={profile} />

        {isBusiness ? <OrganizationDetailsForm profile={profile} /> : null}

        <PasswordChangeForm />
      </div>
    </div>
  );
}
