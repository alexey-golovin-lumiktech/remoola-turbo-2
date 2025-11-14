export interface PasswordOptions {
  length?: number;
  uppercase?: boolean;
  lowercase?: boolean;
  digits?: boolean;
  symbols?: boolean;
  noAmbiguous?: boolean;
}

export function generatePassword(options: PasswordOptions = {}): string {
  const {
    length = 12,
    uppercase = true,
    lowercase = true,
    digits = true,
    symbols = false,
    noAmbiguous = true,
  } = options;

  const upper = noAmbiguous ? `ABCDEFGHJKLMNPQRSTUVWXYZ` : `ABCDEFGHIJKLMNOPQRSTUVWXYZ`;

  const lower = noAmbiguous ? `abcdefghijkmnopqrstuvwxyz` : `abcdefghijklmnopqrstuvwxyz`;

  const digit = noAmbiguous ? `23456789` : `0123456789`;

  const sym = `!@#$%^&*()_-+=[]{}`;

  let charset = ``;
  if (uppercase) charset += upper;
  if (lowercase) charset += lower;
  if (digits) charset += digit;
  if (symbols) charset += sym;

  if (!charset.length) return ``;

  const buffer = new Uint32Array(length);
  if (!buffer) throw new Error(`Failed to generate random bytes`);
  crypto.getRandomValues(buffer);

  let password = ``;
  for (let i = 0; i < length; i++) {
    password += charset[buffer[i]! % charset.length];
  }

  return password;
}
