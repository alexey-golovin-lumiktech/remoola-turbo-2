import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { HELP_GUIDE_SLUG } from '../../../features/help/guide-registry';

import type * as ConsumerApi from '../../../lib/consumer-api.server';

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

jest.mock(`../../../lib/consumer-api.server`, () => ({
  getContact: jest.fn(),
  getContacts: jest.fn(),
  searchContacts: jest.fn(),
}));

const {
  getContact: mockedGetContact,
  getContacts: mockedGetContacts,
  searchContacts: mockedSearchContacts,
} = jest.requireMock(`../../../lib/consumer-api.server`) as jest.Mocked<typeof ConsumerApi>;

jest.mock(`./ContactsClient`, () => ({
  ContactsClient: () => React.createElement(`section`, null, `Contacts client loaded`),
}));

async function loadSubject() {
  return (await import(`./page`)).default;
}

let ContactsPage: Awaited<ReturnType<typeof loadSubject>>;

describe(`consumer-css-grid contacts route contextual help`, () => {
  beforeAll(async () => {
    ContactsPage = await loadSubject();
  });

  beforeEach(() => {
    mockedGetContact.mockReset();
    mockedGetContacts.mockReset();
    mockedSearchContacts.mockReset();

    mockedGetContacts.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
  });

  it(`renders contextual help for the contacts route`, async () => {
    const markup = renderToStaticMarkup(
      await ContactsPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(markup).toContain(`Use contacts without losing the next step`);
    expect(markup).toContain(`Contacts client loaded`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.CONTACTS_ADD_AND_USE}`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.CONTACTS_OVERVIEW}`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.CONTACTS_COMMON_ISSUES}`);
  });
});
