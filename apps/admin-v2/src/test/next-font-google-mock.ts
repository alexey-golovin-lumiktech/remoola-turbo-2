// Jest-only mock for `next/font/google`.
// Returning `variable: undefined` (and `className: undefined`) keeps
// React from emitting a `class` attribute on elements that bind
// `inter.variable` / `inter.className`, so renderToStaticMarkup output
// stays byte-equivalent to the pre-Inter shell. Authorized by
// admin-v2-tailwind-uplift-pack/SLICE-001 §15 ("disable Inter's
// variable injection in the test environment").
const fontFactory = () => ({
  className: undefined,
  variable: undefined,
  style: { fontFamily: `Inter` },
});

module.exports = new Proxy(
  {},
  {
    get: () => fontFactory,
  },
);
