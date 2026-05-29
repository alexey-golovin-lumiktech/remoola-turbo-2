import { describe, expect, it } from '@jest/globals';

import { buildContactsPageHref, buildContactsQueryHref, countContactsWithAddress } from './contacts-page-state';

describe(`contacts-page-state`, () => {
  it(`resets pagination when the search query changes`, () => {
    expect(buildContactsQueryHref(`/contacts`, `page=3&pageSize=20&query=Old`, `Vendor Two`)).toBe(
      `/contacts?query=Vendor+Two`,
    );
  });

  it(`clears query and pagination while preserving unrelated params`, () => {
    expect(buildContactsQueryHref(`/contacts`, `edit=contact-1&page=2&pageSize=20&query=Old`, ``)).toBe(
      `/contacts?edit=contact-1`,
    );
  });

  it(`preserves current search params when navigating pages`, () => {
    expect(buildContactsPageHref(`/contacts`, `query=Vendor&edit=contact-1`, 4, 20)).toBe(
      `/contacts?query=Vendor&edit=contact-1&page=4&pageSize=20`,
    );
  });

  it(`counts only contacts with at least one address field`, () => {
    expect(
      countContactsWithAddress([
        { id: `1`, email: `one@example.com`, address: { city: `London` } },
        { id: `2`, email: `two@example.com`, address: null },
      ]),
    ).toBe(1);
  });
});
