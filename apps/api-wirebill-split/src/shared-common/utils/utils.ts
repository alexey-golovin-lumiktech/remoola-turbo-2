import * as crypto from 'crypto';

const hashPassword = (params = { password: ``, salt: `` }) => {
  if (params.password.length == 0) throw new Error(`Password could not be empty`);
  if (params.salt.length == 0) throw new Error(`Salt could not be empty`);

  return crypto.createHmac(`sha512`, params.salt).update(params.password).digest(`hex`);
};

const getHashingSalt = (rounds = 10) => {
  return crypto.randomBytes(Math.ceil(rounds / 2)).toString(`hex`);
};

const validatePassword = (params = { incomingPass: ``, password: ``, salt: `` }) => {
  if (params.password.length == 0) throw new Error(`Password could not be empty`);
  if (params.salt.length == 0) throw new Error(`Salt could not be empty`);

  const hash = crypto.createHmac(`sha512`, params.salt).update(params.incomingPass).digest(`hex`);
  return params.password === hash;
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

export const passwordUtils = {
  hashPassword,
  getHashingSalt,
  validatePassword,
  generateStrongPassword,
};
