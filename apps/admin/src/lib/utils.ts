export const cn = (...xs: (string | false | null | undefined)[]) => {
  return xs.filter(Boolean).join(` `);
};
