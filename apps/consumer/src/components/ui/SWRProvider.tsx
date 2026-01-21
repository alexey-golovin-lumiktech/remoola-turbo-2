'use client';

import { type ReactNode } from 'react';
import { SWRConfig } from 'swr';

import { swrConfig, swrFetcher } from '../../lib/client';

interface SWRProviderProps {
  children: ReactNode;
}

export function SWRProvider({ children }: SWRProviderProps) {
  return <SWRConfig value={{ ...swrConfig, fetcher: swrFetcher }}>{children}</SWRConfig>;
}
