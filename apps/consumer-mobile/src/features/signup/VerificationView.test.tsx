import { useSearchParams } from 'next/navigation';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { VerificationView } from './VerificationView';

jest.mock(`next/navigation`, () => ({
  useSearchParams: jest.fn(),
}));

jest.mock(`next/link`, () => {
  const Link = ({
    href,
    children,
    prefetch: _prefetch,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    prefetch?: boolean;
  }) => React.createElement(`a`, { href, ...props }, children);
  return Link;
});

const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;

function mockSearchParams(values: Record<string, string | null>) {
  mockUseSearchParams.mockReturnValue({
    get: (key: string) => values[key] ?? null,
  } as ReturnType<typeof useSearchParams>);
}

describe(`consumer-mobile signup verification view`, () => {
  it(`shows the invalid-link state when only referer is present`, () => {
    mockSearchParams({ referer: `https://mobile.example.com` });

    const markup = renderToStaticMarkup(<VerificationView />);

    expect(markup).toContain(`Invalid verification link`);
    expect(markup).toContain(`Go back to signup`);
  });

  it(`renders success from verified=yes without requiring email`, () => {
    mockSearchParams({ verified: `yes` });

    const markup = renderToStaticMarkup(<VerificationView />);

    expect(markup).toContain(`Email Verified`);
    expect(markup).toContain(`Your email has been successfully verified.`);
    expect(markup).toContain(`Continue to Login`);
  });

  it(`renders failure from verified=no without requiring email`, () => {
    mockSearchParams({ verified: `no` });

    const markup = renderToStaticMarkup(<VerificationView />);

    expect(markup).toContain(`Verification Failed`);
    expect(markup).toContain(`This verification link is invalid or expired.`);
    expect(markup).toContain(`Try signing up again`);
  });
});
