'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { ACCOUNT_TYPE, CONTRACTOR_KIND, type TAccountType, type TContractorKind } from '@remoola/api-types';

import { getAuthErrorMessage } from '../../../../lib/auth-error-messages';
import styles from '../../auth-pages.module.css';

function parseAccountType(raw: string | null): TAccountType | null {
  return raw === ACCOUNT_TYPE.BUSINESS || raw === ACCOUNT_TYPE.CONTRACTOR ? raw : null;
}

function parseContractorKind(raw: string | null): TContractorKind | null {
  return raw === CONTRACTOR_KIND.ENTITY || raw === CONTRACTOR_KIND.INDIVIDUAL ? raw : null;
}

export function SignupStartPageClient({
  accountTypeParam,
  contractorKindParam,
  googleSignupToken,
}: {
  accountTypeParam?: string;
  contractorKindParam?: string;
  googleSignupToken: string | null;
}) {
  const router = useRouter();
  const [accountType, setAccountType] = useState<TAccountType | null>(() => parseAccountType(accountTypeParam ?? null));
  const [contractorKind, setContractorKind] = useState<TContractorKind | null>(() =>
    parseContractorKind(contractorKindParam ?? null),
  );
  const [googleEmail, setGoogleEmail] = useState(``);
  const [googleError, setGoogleError] = useState<string | undefined>();

  useEffect(() => {
    setAccountType(parseAccountType(accountTypeParam ?? null));
    setContractorKind(parseContractorKind(contractorKindParam ?? null));
  }, [accountTypeParam, contractorKindParam]);

  useEffect(() => {
    if (!googleSignupToken) return;

    let cancelled = false;
    setGoogleError(undefined);

    void fetch(`/api/consumer/auth/google/signup-session?token=${encodeURIComponent(googleSignupToken)}`, {
      credentials: `include`,
      cache: `no-store`,
    })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as { email?: string; code?: string; message?: string };
        if (cancelled) return;
        if (!response.ok) {
          setGoogleError(getAuthErrorMessage(data.code ?? data.message, `Could not load your Google sign-up session.`));
          return;
        }
        setGoogleEmail(data.email ?? ``);
      })
      .catch(() => {
        if (!cancelled) {
          setGoogleError(`Could not load your Google sign-up session. Please try again.`);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [googleSignupToken]);

  const canContinue = useMemo(() => {
    if (!accountType) return false;
    if (accountType === ACCOUNT_TYPE.CONTRACTOR) return contractorKind != null;
    return true;
  }, [accountType, contractorKind]);

  const continueToSignup = () => {
    if (!canContinue || !accountType) return;

    const params = new URLSearchParams();
    params.set(`accountType`, accountType);
    if (accountType === ACCOUNT_TYPE.CONTRACTOR && contractorKind) {
      params.set(`contractorKind`, contractorKind);
    }
    if (googleSignupToken) {
      params.set(`googleSignupToken`, googleSignupToken);
    }

    router.push(`/signup?${params.toString()}`);
  };

  return (
    <div className={styles.root}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Create your Remoola account</h1>
          <p className={styles.subtitle}>Start with the account type that best matches how you will use Remoola.</p>
        </div>

        <div className={styles.card}>
          <div className={styles.stack}>
            {googleSignupToken ? (
              <div className={styles.mutedBanner}>
                {googleError ? (
                  <p>{googleError}</p>
                ) : googleEmail ? (
                  <p>Signing up with Google account: {googleEmail}</p>
                ) : (
                  <p>Loading your Google sign-up session...</p>
                )}
              </div>
            ) : null}

            <div className={styles.section}>
              <div>
                <h2 className={styles.sectionTitle}>Choose your account type</h2>
                <p className={styles.sectionText}>
                  You can change profile details later, but this keeps onboarding accurate.
                </p>
              </div>

              <div className={styles.optionGrid}>
                <button
                  type="button"
                  onClick={() => {
                    setAccountType(ACCOUNT_TYPE.CONTRACTOR);
                    if (!contractorKind) setContractorKind(CONTRACTOR_KIND.INDIVIDUAL);
                  }}
                  className={`${styles.optionCard} ${
                    accountType === ACCOUNT_TYPE.CONTRACTOR ? styles.optionCardActive : styles.optionCardIdle
                  }`}
                >
                  <p className={styles.optionTitle}>Contractor</p>
                  <p className={styles.optionText}>
                    For freelancers and independent workers receiving or sending payments.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAccountType(ACCOUNT_TYPE.BUSINESS);
                    setContractorKind(null);
                  }}
                  className={`${styles.optionCard} ${
                    accountType === ACCOUNT_TYPE.BUSINESS ? styles.optionCardActive : styles.optionCardIdle
                  }`}
                >
                  <p className={styles.optionTitle}>Business</p>
                  <p className={styles.optionText}>
                    For companies and teams managing payouts, requests, and onboarding.
                  </p>
                </button>
              </div>
            </div>

            {accountType === ACCOUNT_TYPE.CONTRACTOR ? (
              <div className={styles.section}>
                <div>
                  <h2 className={styles.sectionTitle}>Contractor type</h2>
                  <p className={styles.sectionText}>
                    Tell us whether you are signing up as an individual or an entity.
                  </p>
                </div>

                <div className={styles.pillRow}>
                  <button
                    type="button"
                    onClick={() => setContractorKind(CONTRACTOR_KIND.INDIVIDUAL)}
                    className={`${styles.pill} ${
                      contractorKind === CONTRACTOR_KIND.INDIVIDUAL ? styles.pillActive : ``
                    }`}
                  >
                    Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => setContractorKind(CONTRACTOR_KIND.ENTITY)}
                    className={`${styles.pill} ${contractorKind === CONTRACTOR_KIND.ENTITY ? styles.pillActive : ``}`}
                  >
                    Entity
                  </button>
                </div>
              </div>
            ) : null}

            <div className={styles.actions}>
              <button type="button" className={styles.submitBtn} disabled={!canContinue} onClick={continueToSignup}>
                Continue
              </button>
            </div>
          </div>
        </div>

        <p className={styles.footer}>
          Already have an account?{` `}
          <Link href="/login" prefetch={false} className={styles.link}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
