'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';

import { type Contact } from './contact-form-state';
import { sanitizeContactsReturnTo } from './contacts-return-to';

type UseContactsPageStateInput = {
  contacts: Contact[];
  returnTo: string;
  initialQuery: string;
  searchMode: boolean;
  totalContacts: number;
  page: number;
  pageSize: number;
};

export function countContactsWithAddress(contacts: Contact[]) {
  return contacts.filter((contact) => {
    const address = contact.address;
    return Boolean(address?.city || address?.country || address?.street || address?.postalCode || address?.state);
  }).length;
}

export function buildContactsQueryHref(pathname: string, searchParams: string, nextQuery: string) {
  const params = new URLSearchParams(searchParams);
  const trimmedQuery = nextQuery.trim();

  if (trimmedQuery) {
    params.set(`query`, trimmedQuery);
  } else {
    params.delete(`query`);
  }

  params.delete(`page`);
  params.delete(`pageSize`);

  const nextParams = params.toString();
  return nextParams ? `${pathname}?${nextParams}` : pathname;
}

export function buildContactsPageHref(pathname: string, searchParams: string, nextPage: number, pageSize: number) {
  const params = new URLSearchParams(searchParams);
  params.set(`page`, String(nextPage));
  params.set(`pageSize`, String(pageSize));
  const nextParams = params.toString();
  return nextParams ? `${pathname}?${nextParams}` : pathname;
}

export function useContactsPageState({
  contacts,
  returnTo,
  initialQuery,
  searchMode,
  totalContacts,
  page,
  pageSize,
}: UseContactsPageStateInput) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [isSearchPending, startSearchTransition] = useTransition();

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const totalPages = Math.max(1, Math.ceil(totalContacts / pageSize));
  const withAddress = useMemo(() => countContactsWithAddress(contacts), [contacts]);
  const safeReturnTo = sanitizeContactsReturnTo(returnTo);
  const currentSearchParams = searchParams.toString();

  const applyQuery = (nextQuery: string) => {
    startSearchTransition(() => {
      router.push(buildContactsQueryHref(pathname, currentSearchParams, nextQuery));
    });
  };

  const applyPage = (nextPage: number) => {
    router.push(buildContactsPageHref(pathname, currentSearchParams, nextPage, pageSize));
  };

  return {
    applyPage,
    applyQuery,
    currentSearchParams,
    isSearchPending,
    page,
    pageSize,
    pathname,
    query,
    safeReturnTo,
    searchMode,
    setQuery,
    totalContacts,
    totalPages,
    withAddress,
  };
}

export type ContactsPageStateResult = ReturnType<typeof useContactsPageState>;
