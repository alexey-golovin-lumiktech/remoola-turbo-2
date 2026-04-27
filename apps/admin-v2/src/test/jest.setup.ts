import type * as ReactModule from 'react';

process.env.COOKIE_SECURE = `false`;
process.env.COOKIE_SECURE = `false`;

/** Allow async server components to resolve `headers()` and `cookies()` in Jest. */
jest.mock(`next/headers`, () => ({
  headers: async () => ({
    get: (name: string) => (name === `next-url` || name === `x-pathname` ? null : null),
  }),
  cookies: async () => ({
    get: () => undefined,
  }),
}));

/** Keep shell layout tests synchronous by replacing the drawer with a passthrough. */
jest.mock(`../components/mobile-shell-drawer`, () => {
  const React = jest.requireActual<typeof ReactModule>(`react`);
  return {
    MobileShellDrawer: (props: { children?: ReactModule.ReactNode }) =>
      React.createElement(React.Fragment, null, props.children),
  };
});

/** Stub shell header for layout integration tests. */
jest.mock(`../components/shell-header`, () => {
  const React = jest.requireActual<typeof ReactModule>(`react`);
  return {
    ShellHeader: () =>
      React.createElement(`header`, { className: `shellHeader`, 'data-testid': `shell-header-mock` }, `ShellHeader`),
  };
});
