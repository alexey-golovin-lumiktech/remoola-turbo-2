export const ago = (date?: Date) => {
  if (!date) return `—`;

  const rounded = Math.round((+date - Date.now()) / 86400000);
  return new Intl.RelativeTimeFormat(`en`, { numeric: `auto` }).format(rounded, `day`);
};
