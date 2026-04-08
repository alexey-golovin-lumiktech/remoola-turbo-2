import { renderToStaticMarkup } from 'react-dom/server';

import SignupVerificationPage from './page';

describe(`consumer-css-grid signup verification page`, () => {
  it(`shows the invalid-link state when only referer is present`, async () => {
    const markup = renderToStaticMarkup(
      await SignupVerificationPage({
        searchParams: Promise.resolve({
          referer: `https://grid.example.com`,
        }),
      }),
    );

    expect(markup).toContain(`Invalid verification link`);
    expect(markup).toContain(`Start sign-up again`);
  });

  it(`renders success from verified=yes without requiring email`, async () => {
    const markup = renderToStaticMarkup(
      await SignupVerificationPage({
        searchParams: Promise.resolve({
          verified: `yes`,
        }),
      }),
    );

    expect(markup).toContain(`Email verified`);
    expect(markup).toContain(`Your email has been verified successfully.`);
    expect(markup).toContain(`Continue to sign in`);
  });

  it(`renders failure from verified=no without requiring email`, async () => {
    const markup = renderToStaticMarkup(
      await SignupVerificationPage({
        searchParams: Promise.resolve({
          verified: `no`,
        }),
      }),
    );

    expect(markup).toContain(`Verification failed`);
    expect(markup).toContain(`This verification link is invalid or expired.`);
    expect(markup).toContain(`Try sign-up again`);
  });
});
