const CHARSET = `ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()_+`;

export function generatePassword(length = 12): string {
  const array = new Uint32Array(length);
  if (typeof crypto !== `undefined` && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 2 ** 32);
    }
  }

  let password = ``;
  for (let i = 0; i < array.length; i++) {
    const byte = array[i]!;
    password += CHARSET[byte % CHARSET.length];
  }
  return password;
}
