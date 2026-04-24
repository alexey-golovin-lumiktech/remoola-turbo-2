import type * as ReactModule from 'react';

process.env.COOKIE_SECURE = `false`;
process.env.COOKIE_SECURE = `false`;

/** Lets async server components in shell + tests resolve `headers()` / `cookies()` under Jest (no request context). */
jest.mock(`next/headers`, () => ({
  headers: async () => ({
    get: (name: string) => (name === `next-url` || name === `x-pathname` ? null : null),
  }),
  cookies: async () => ({
    get: () => undefined,
  }),
}));

/**
 * `renderToStaticMarkup` + client boundaries: replace the real drawer (hooks, effects) with a passthrough so shell
 * layout tests stay synchronous (SLICE-005); drawer behavior is covered by manual / e2e checks.
 */
jest.mock(`../components/mobile-shell-drawer`, () => {
  const React = jest.requireActual<typeof ReactModule>(`react`);
  return {
    MobileShellDrawer: (props: { children?: ReactModule.ReactNode }) =>
      React.createElement(React.Fragment, null, props.children),
  };
});

/** Async RSC + `renderToStaticMarkup` suspends in Jest; stub for layout integration tests. */
jest.mock(`../components/shell-header`, () => {
  const React = jest.requireActual<typeof ReactModule>(`react`);
  return {
    ShellHeader: () =>
      React.createElement(`header`, { className: `shellHeader`, 'data-testid': `shell-header-mock` }, `ShellHeader`),
  };
});
