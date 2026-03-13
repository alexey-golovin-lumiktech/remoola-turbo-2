'use client';

import { Elements } from '@stripe/react-stripe-js';
import { loadStripe, type Stripe, type Appearance } from '@stripe/stripe-js';
import { type ReactNode, useEffect, useState, useMemo } from 'react';

import styles from './StripeProvider.module.css';
import { getClientEnv } from '../../lib/env.client';
import { clientLogger } from '../../lib/logger';
import { showErrorToast } from '../../lib/toast.client';
import { useTheme } from '../ui/ThemeProvider';

let stripePromise: Promise<Stripe | null> | null = null;

function getStripePromise(): Promise<Stripe | null> {
  if (stripePromise === null) {
    const env = getClientEnv();
    stripePromise = loadStripe(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
}

interface StripeProviderProps {
  children: ReactNode;
  clientSecret?: string;
}

export function StripeProvider({ children, clientSecret }: StripeProviderProps) {
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    getStripePromise()
      .then((stripeInstance) => {
        if (stripeInstance) {
          setStripe(stripeInstance);
        } else {
          const msg = `Failed to load Stripe`;
          clientLogger.error(msg);
          showErrorToast(msg);
          setError(msg);
        }
      })
      .catch(() => {
        const msg = `Failed to initialize Stripe`;
        clientLogger.error(msg);
        showErrorToast(msg);
        setError(msg);
      });
  }, []);

  const appearance = useMemo<Appearance>(() => {
    const isDark = resolvedTheme === `dark`;

    return {
      theme: isDark ? `night` : `stripe`,
      variables: {
        colorPrimary: `#2563eb`,
        colorBackground: isDark ? `#1e293b` : `#ffffff`,
        colorText: isDark ? `#e2e8f0` : `#1e293b`,
        colorDanger: `#ef4444`,
        colorSuccess: `#10b981`,
        fontFamily: `system-ui, -apple-system, sans-serif`,
        spacingUnit: `4px`,
        borderRadius: `8px`,
        fontSizeBase: `14px`,
      },
    };
  }, [resolvedTheme]);

  if (error) {
    return <p className={styles.errorText}>Payment setup unavailable. Please refresh the app.</p>;
  }

  if (!stripe) {
    return (
      <div className={styles.loadingRoot}>
        <div className={styles.spinner} />
      </div>
    );
  }

  if (clientSecret) {
    return (
      <Elements
        stripe={stripe}
        options={{
          clientSecret,
          appearance,
        }}
      >
        {children}
      </Elements>
    );
  }

  return (
    <Elements
      stripe={stripe}
      options={{
        appearance,
      }}
    >
      {children}
    </Elements>
  );
}
