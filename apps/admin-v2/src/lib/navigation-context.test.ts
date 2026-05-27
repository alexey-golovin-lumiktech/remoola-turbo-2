import { describe, expect, it } from '@jest/globals';

import { buildPathWithSearch, readReturnTo, withReturnTo } from './navigation-context';

describe(`navigation context helpers`, () => {
  it(`builds paths with the shared query serialization rules`, () => {
    expect(
      buildPathWithSearch(`/verification`, {
        page: 0,
        q: `  pending  `,
        missingDocuments: false,
        empty: `   `,
      }),
    ).toBe(`/verification?page=0&q=pending&missingDocuments=false`);
  });

  it(`appends returnTo using normalized local paths only`, () => {
    expect(withReturnTo(`/login`, `/verification?page=2`)).toBe(`/login?from=%2Fverification%3Fpage%3D2`);
    expect(readReturnTo(`/verification?page=2`, `/overview`)).toBe(`/verification?page=2`);
    expect(readReturnTo(`javascript:alert(1)`, `/overview`)).toBe(`/overview`);
  });
});
