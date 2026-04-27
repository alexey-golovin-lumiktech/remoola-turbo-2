// Keep `next/font/google` stable in Jest snapshots.
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
