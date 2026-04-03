'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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
  logoutAllFailed?: boolean;
}

export function SettingsView({ loadState, profile, settings, logoutAllFailed = false }: SettingsViewProps) {
  const router = useRouter();
  const [logoutAllErrorVisible, setLogoutAllErrorVisible] = useState(logoutAllFailed);

  useEffect(() => {
    setLogoutAllErrorVisible(logoutAllFailed);
    if (!logoutAllFailed || typeof window === `undefined`) return;

    const url = new URL(window.location.href);
    if (!url.searchParams.has(`logout_all_failed`)) return;
    url.searchParams.delete(`logout_all_failed`);
    window.history.replaceState(null, ``, url.pathname + (url.search || ``));
  }, [logoutAllFailed]);

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
        {logoutAllErrorVisible ? (
          <div className={styles.errorNotice} role="alert" data-testid="consumer-mobile-settings-logout-all-error">
            <div>
              <strong>Couldn&apos;t sign out all devices.</strong>
              <p className={styles.errorNoticeText}>Your current session is still active. Please try again.</p>
            </div>
            <button type="button" className={styles.errorNoticeDismiss} onClick={() => setLogoutAllErrorVisible(false)}>
              Dismiss
            </button>
          </div>
        ) : null}
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

        <PasswordChangeForm hasPassword={profile.hasPassword !== false} />

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderRow}>
              <div className={styles.cardHeaderIconWrap}>
                <SettingsIcon className={styles.cardHeaderIcon} />
              </div>
              <div>
                <h2 className={styles.cardHeaderTitle}>Session Management</h2>
                <p className={styles.cardHeaderSub}>Sign out this device or revoke every active session.</p>
              </div>
            </div>
          </div>
          <div className={styles.sessionActions}>
            <form method="post" action="/logout">
              <button type="submit" className={styles.sessionButton}>
                Sign out this device
              </button>
            </form>
            <form method="post" action="/logout-all">
              <button
                type="submit"
                className={styles.sessionDangerButton}
                onClick={(event) => {
                  if (!window.confirm(`Sign out all devices? You will need to sign in again everywhere.`)) {
                    event.preventDefault();
                  }
                }}
              >
                Sign out all devices
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
