import Link from 'next/link';

import { ACCOUNT_TYPE } from '@remoola/api-types';

import { AddressDetailsForm } from './AddressDetailsForm';
import { OrganizationDetailsForm } from './OrganizationDetailsForm';
import { PasswordChangeForm } from './PasswordChangeForm';
import { PersonalDetailsForm } from './PersonalDetailsForm';
import { PreferredCurrencyForm } from './PreferredCurrencyForm';
import { ThemeSettingsForm } from './ThemeSettingsForm';

import type { Profile, Settings } from '../schemas';

interface SettingsViewProps {
  profile: Profile | null;
  settings: Settings | null;
}

export function SettingsView({ profile, settings }: SettingsViewProps) {
  if (!profile) {
    return (
      <div className="space-y-6" data-testid="consumer-mobile-settings-view">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm text-slate-600 dark:text-slate-400">Unable to load profile. Please try again later.</p>
        </div>
      </div>
    );
  }

  const isBusiness = profile.accountType === ACCOUNT_TYPE.BUSINESS;

  return (
    <div className="space-y-6 pb-8" data-testid="consumer-mobile-settings-view">
      <div className="sticky top-0 z-10 -mx-4 -mt-4 bg-slate-50 px-4 py-4 dark:bg-slate-900 sm:-mx-6 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Manage your profile, preferences, and account settings
        </p>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Quick Links</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Manage your payment methods and documents</p>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            <Link
              href="/payment-methods"
              className="group flex min-h-[60px] items-center justify-between px-6 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/20">
                  <svg
                    className="h-5 w-5 text-primary-600 dark:text-primary-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-slate-900 dark:text-white">Payment Methods</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Manage cards and bank accounts</p>
                </div>
              </div>
              <svg
                className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 dark:text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/documents"
              className="group flex min-h-[60px] items-center justify-between px-6 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary-50 dark:bg-secondary-900/20">
                  <svg
                    className="h-5 w-5 text-secondary-600 dark:text-secondary-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-slate-900 dark:text-white">Documents</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">View and manage your documents</p>
                </div>
              </div>
              <svg
                className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 dark:text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        <ThemeSettingsForm initialTheme={settings?.theme ?? undefined} />

        <PreferredCurrencyForm initialCurrency={settings?.preferredCurrency ?? null} />

        <PersonalDetailsForm profile={profile} />

        <AddressDetailsForm profile={profile} />

        {isBusiness && <OrganizationDetailsForm profile={profile} />}

        <PasswordChangeForm />
      </div>
    </div>
  );
}
