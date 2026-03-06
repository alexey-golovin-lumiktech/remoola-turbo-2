import Link from 'next/link';

import { ACCOUNT_TYPE } from '@remoola/api-types';

import { AddressDetailsForm } from './AddressDetailsForm';
import { OrganizationDetailsForm } from './OrganizationDetailsForm';
import { PasswordChangeForm } from './PasswordChangeForm';
import { PersonalDetailsForm } from './PersonalDetailsForm';
import { PreferredCurrencyForm } from './PreferredCurrencyForm';
import { ThemeSettingsForm } from './ThemeSettingsForm';
import { AlertTriangleIcon } from '../../../shared/ui/icons/AlertTriangleIcon';
import { ChevronRightIcon } from '../../../shared/ui/icons/ChevronRightIcon';
import { CreditCardIcon } from '../../../shared/ui/icons/CreditCardIcon';
import { DocumentIcon } from '../../../shared/ui/icons/DocumentIcon';
import { SettingsIcon } from '../../../shared/ui/icons/SettingsIcon';

import type { Profile, Settings } from '../schemas';

interface SettingsViewProps {
  profile: Profile | null;
  settings: Settings | null;
}

export function SettingsView({ profile, settings }: SettingsViewProps) {
  if (!profile) {
    return (
      <div
        className={`
          min-h-full
          bg-gradient-to-br
          from-slate-50
          via-white
          to-slate-50
          dark:from-slate-950
          dark:via-slate-900
          dark:to-slate-950
        `}
        data-testid="consumer-mobile-settings-view"
      >
        <div
          className={`
          bg-white/95
          dark:bg-slate-900/95
          border-b
          border-slate-200/80
          dark:border-slate-700/80
          shadow-sm
          backdrop-blur-lg
          px-4
          py-6
          sm:px-6
          sm:py-7
          lg:px-8
        `}
        >
          <div className={`mx-auto max-w-6xl`}>
            <div className={`flex items-center gap-4`}>
              <div
                className={`
                flex
                h-12
                w-12
                items-center
                justify-center
                rounded-2xl
                bg-gradient-to-br
                from-primary-500
                to-primary-600
                shadow-lg
                shadow-primary-500/30
                ring-4
                ring-primary-50
                dark:ring-primary-950
                dark:shadow-primary-900/40
              `}
              >
                <SettingsIcon className={`h-6 w-6 text-white`} />
              </div>
              <div>
                <h1
                  className={`
                  text-3xl
                  font-extrabold
                  tracking-tight
                  text-slate-900
                  sm:text-4xl
                  dark:text-white
                `}
                >
                  Settings
                </h1>
                <p
                  className={`
                  text-sm
                  font-medium
                  text-slate-600
                  dark:text-slate-400
                `}
                >
                  Unable to load profile
                </p>
              </div>
            </div>
          </div>
        </div>
        <div
          className={`
          mx-auto
          max-w-6xl
          px-4
          pt-6
          pb-6
          sm:px-6
          sm:pt-8
          lg:px-8
        `}
        >
          <div
            className={`
            animate-fadeIn
            rounded-2xl
            border-2
            border-dashed
            border-slate-200
            bg-gradient-to-br
            from-slate-50/50
            to-white/50
            dark:border-slate-700
            dark:from-slate-800/50
            dark:to-slate-900/50
            px-6
            py-16
            text-center
            shadow-inner
          `}
          >
            <div
              className={`
              mx-auto
              mb-6
              flex
              h-20
              w-20
              items-center
              justify-center
              rounded-3xl
              bg-gradient-to-br
              from-slate-100
              to-slate-200
              text-slate-400
              shadow-lg
              ring-8
              ring-slate-100/50
              dark:from-slate-700
              dark:to-slate-800
              dark:text-slate-500
              dark:ring-slate-800/50
            `}
            >
              <AlertTriangleIcon className={`h-10 w-10`} strokeWidth={1.5} />
            </div>
            <h3
              className={`
              text-xl
              font-bold
              text-slate-900
              dark:text-slate-100
            `}
            >
              Unable to load profile
            </h3>
            <p
              className={`
              mt-3
              max-w-sm
              mx-auto
              text-base
              text-slate-600
              dark:text-slate-400
            `}
            >
              Please try again later or contact support if the problem persists.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isBusiness = profile.accountType === ACCOUNT_TYPE.BUSINESS;

  return (
    <div
      className={`
        min-h-full
        bg-gradient-to-br
        from-slate-50
        via-white
        to-slate-50
        dark:from-slate-950
        dark:via-slate-900
        dark:to-slate-950
      `}
      data-testid="consumer-mobile-settings-view"
    >
      <div
        className={`
        bg-white/95
        dark:bg-slate-900/95
        border-b
        border-slate-200/80
        dark:border-slate-700/80
        shadow-sm
        backdrop-blur-lg
        px-4
        py-6
        sm:px-6
        sm:py-7
        lg:px-8
      `}
      >
        <div className={`mx-auto max-w-6xl`}>
          <div className={`flex items-center gap-4`}>
            <div
              className={`
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-2xl
              bg-gradient-to-br
              from-primary-500
              to-primary-600
              shadow-lg
              shadow-primary-500/30
              ring-4
              ring-primary-50
              dark:ring-primary-950
              dark:shadow-primary-900/40
            `}
            >
              <SettingsIcon className={`h-6 w-6 text-white`} />
            </div>
            <div>
              <h1
                className={`
                text-3xl
                font-extrabold
                tracking-tight
                text-slate-900
                sm:text-4xl
                dark:text-white
              `}
              >
                Settings
              </h1>
              <p
                className={`
                text-sm
                font-medium
                text-slate-600
                dark:text-slate-400
              `}
              >
                Manage your profile, preferences, and account settings
              </p>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`
        mx-auto
        max-w-6xl
        px-4
        pt-6
        pb-6
        sm:px-6
        sm:pt-8
        lg:px-8
        space-y-6
        animate-fadeIn
      `}
      >
        <div
          className={`
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-md
          dark:border-slate-700
          dark:bg-slate-800
          overflow-hidden
        `}
        >
          <div
            className={`
            border-b
            border-slate-200
            px-6
            py-5
            bg-gradient-to-r
            from-slate-50
            to-white
            dark:border-slate-700
            dark:from-slate-800
            dark:to-slate-800/50
          `}
          >
            <div className={`flex items-center gap-3`}>
              <div
                className={`
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                bg-gradient-to-br
                from-primary-500
                to-primary-600
                shadow-md
              `}
              >
                <svg
                  className={`h-5 w-5 text-white`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
              </div>
              <div>
                <h2
                  className={`
                  text-lg
                  font-bold
                  text-slate-900
                  dark:text-white
                `}
                >
                  Quick Links
                </h2>
                <p className={`text-sm text-slate-600 dark:text-slate-400`}>
                  Manage your payment methods and documents
                </p>
              </div>
            </div>
          </div>
          <div className={`divide-y divide-slate-200 dark:divide-slate-700`}>
            <Link
              href="/payment-methods"
              className={`
                group
                flex
                min-h-18
                items-center
                justify-between
                px-6
                py-5
                transition-all
                hover:bg-slate-50
                dark:hover:bg-slate-700/50
                active:scale-[0.99]
              `}
            >
              <div className={`flex items-center gap-4`}>
                <div
                  className={`
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-xl
                  bg-gradient-to-br
                  from-primary-50
                  to-primary-100
                  dark:from-primary-900/20
                  dark:to-primary-900/10
                  shadow-sm
                  ring-1
                  ring-primary-100
                  dark:ring-primary-900/30
                `}
                >
                  <CreditCardIcon
                    className={`
                    h-6
                    w-6
                    text-primary-600
                    dark:text-primary-400
                  `}
                  />
                </div>
                <div>
                  <h3 className={`font-semibold text-slate-900 dark:text-white`}>Payment Methods</h3>
                  <p className={`text-sm text-slate-600 dark:text-slate-400`}>Manage cards and bank accounts</p>
                </div>
              </div>
              <ChevronRightIcon
                className={`
                h-5
                w-5
                text-slate-400
                transition-all
                group-hover:translate-x-1
                group-hover:text-primary-500
                dark:text-slate-500
              `}
              />
            </Link>
            <Link
              href="/documents"
              className={`
                group
                flex
                min-h-18
                items-center
                justify-between
                px-6
                py-5
                transition-all
                hover:bg-slate-50
                dark:hover:bg-slate-700/50
                active:scale-[0.99]
              `}
            >
              <div className={`flex items-center gap-4`}>
                <div
                  className={`
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-xl
                  bg-gradient-to-br
                  from-secondary-50
                  to-secondary-100
                  dark:from-secondary-900/20
                  dark:to-secondary-900/10
                  shadow-sm
                  ring-1
                  ring-secondary-100
                  dark:ring-secondary-900/30
                `}
                >
                  <DocumentIcon
                    className={`
                    h-6
                    w-6
                    text-secondary-600
                    dark:text-secondary-400
                  `}
                  />
                </div>
                <div>
                  <h3 className={`font-semibold text-slate-900 dark:text-white`}>Documents</h3>
                  <p className={`text-sm text-slate-600 dark:text-slate-400`}>View and manage your documents</p>
                </div>
              </div>
              <ChevronRightIcon
                className={`
                h-5
                w-5
                text-slate-400
                transition-all
                group-hover:translate-x-1
                group-hover:text-primary-500
                dark:text-slate-500
              `}
              />
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
