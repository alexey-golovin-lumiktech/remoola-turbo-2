'use client';

import { Elements } from '@stripe/react-stripe-js';
import { loadStripe, type Stripe, type Appearance } from '@stripe/stripe-js';
import { type ReactNode, useEffect, useState, useMemo } from 'react';

import { getClientEnv } from '../../lib/env.client';
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
          setError(`Failed to load Stripe`);
        }
      })
      .catch(() => {
        setError(`Failed to initialize Stripe`);
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
    return (
      <div
        className={`
  rounded-lg
  border
  border-red-200
  bg-red-50
  p-4
  dark:border-red-800
  dark:bg-red-900/20
        `}
      >
        <p className={`text-sm text-red-800 dark:text-red-300`}>{error}</p>
      </div>
    );
  }

  if (!stripe) {
    return (
      <div
        className={`
  flex
  items-center
  justify-center
  p-8
        `}
      >
        <div
          className={`
  h-8
  w-8
  animate-spin
  rounded-full
  border-4
  border-slate-200
  border-t-primary-600
          `}
        />
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
