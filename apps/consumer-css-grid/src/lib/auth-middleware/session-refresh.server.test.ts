import { describe, expect, it } from '@jest/globals';
import { NextRequest } from 'next/server';

import { mergeRequestCookiesWithResponse } from './session-refresh.server';

describe(`auth middleware cookie merge`, () => {
  it(`preserves the first request-cookie occurrence before applying upstream overwrites`, () => {
    const request = new NextRequest(`https://example.com/settings`, {
      headers: {
        cookie: `consumer_refresh=first; consumer_refresh=second; theme=light`,
      },
    });
    const responseHeaders = new Headers({
      'set-cookie': `consumer_access=new-access; Path=/; HttpOnly`,
    });

    expect(mergeRequestCookiesWithResponse(request, responseHeaders)).toBe(
      `consumer_refresh=first; theme=light; consumer_access=new-access`,
    );
  });
});
