import * as crypto from 'crypto';

const getHashingSalt = (rounds = 10) => {
  return crypto.randomBytes(Math.ceil(rounds / 2)).toString(`hex`);
};

export const generateStrongPassword = () => {
  const lowerChars = `abcdefghijklmnopqrstuvwxyz`;
  const upperChars = `ABCDEFGHIJKLMNOPQRSTUVWXYZ`;
  const intChars = `0123456789`;
  const specChars = `#?!@$%^&*`;
  const password: string[] = [];

  const getRandomValue = (source: string) => {
    return source[Math.floor(Math.random() * source.length)];
  };

  for (let i = 0; i < 3; i++) {
    password.push(getRandomValue(upperChars));
    password.push(getRandomValue(intChars));
    password.push(getRandomValue(specChars));
    password.push(getRandomValue(lowerChars));
  }

  return encodeURIComponent(password.join(``));
};

export const verifyPassword = async (params: { password: string; storedHash: string; storedSalt: string }) => {
  const hash = await new Promise<string>((resolve, reject) => {
    crypto.pbkdf2(params.password, params.storedSalt, 100_000, 64, `sha512`, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey.toString(`hex`));
    });
  });

  // Constant-time comparison to avoid timing attacks
  return crypto.timingSafeEqual(Buffer.from(hash, `hex`), Buffer.from(params.storedHash, `hex`));
};

export const hashPassword = async (password: string) => {
  const salt = getHashingSalt(16);

  const hash = await new Promise<string>((resolve, reject) => {
    crypto.pbkdf2(password, salt, 100_000, 64, `sha512`, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey.toString(`hex`));
    });
  });

  return { hash, salt };
};

export const passwordUtils = {
  generateStrongPassword,
  verifyPassword,
  hashPassword,
};
