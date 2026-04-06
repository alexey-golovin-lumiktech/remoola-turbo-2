import { useSearchParams } from 'next/navigation';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import Verification from './Verification';

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

describe(`consumer signup verification view`, () => {
  it(`shows the invalid-link state when only referer is present`, () => {
    mockSearchParams({ referer: `https://app.example.com` });

    const markup = renderToStaticMarkup(<Verification />);

    expect(markup).toContain(`Invalid or expired verification link`);
    expect(markup).toContain(`Go back to signup`);
  });

  it(`renders success from verified=yes without requiring email`, () => {
    mockSearchParams({ verified: `yes` });

    const markup = renderToStaticMarkup(<Verification />);

    expect(markup).toContain(`Email verified`);
    expect(markup).toContain(`Your email has been successfully verified.`);
    expect(markup).toContain(`Continue to Sign In`);
  });

  it(`renders failure from verified=no without requiring email`, () => {
    mockSearchParams({ verified: `no` });

    const markup = renderToStaticMarkup(<Verification />);

    expect(markup).toContain(`Verification failed`);
    expect(markup).toContain(`This verification link is invalid or expired.`);
    expect(markup).toContain(`Try signing up again`);
  });
});
