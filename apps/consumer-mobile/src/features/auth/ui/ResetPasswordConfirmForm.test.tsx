import { useSearchParams } from 'next/navigation';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { ResetPasswordConfirmForm } from './ResetPasswordConfirmForm';

jest.mock(`next/navigation`, () => ({
  useRouter: () => ({ replace: jest.fn() }),
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

describe(`consumer-mobile reset password confirm form`, () => {
  it(`shows the invalid-link state when only referer is present`, () => {
    mockUseSearchParams.mockReturnValue({
      get: (key: string) => (key === `referer` ? `https://mobile.example.com` : null),
    } as ReturnType<typeof useSearchParams>);

    const markup = renderToStaticMarkup(<ResetPasswordConfirmForm />);

    expect(markup).toContain(`Invalid or missing link`);
    expect(markup).toContain(`Request a new reset link`);
  });

  it(`renders the reset form when token is present without requiring referer`, () => {
    mockUseSearchParams.mockReturnValue({
      get: (key: string) => (key === `token` ? `reset-token` : null),
    } as ReturnType<typeof useSearchParams>);

    const markup = renderToStaticMarkup(<ResetPasswordConfirmForm />);

    expect(markup).toContain(`Set new password`);
    expect(markup).not.toContain(`Invalid or missing link`);
  });
});
