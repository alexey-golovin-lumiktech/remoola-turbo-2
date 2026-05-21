function isDevelopment(): boolean {
  return process.env.NODE_ENV === `development` && process.env.VERCEL !== `1`;
}

export function getDevCredentials() {
  if (!isDevelopment()) {
    return null;
  }
  const email = process.env.DEV_LOGIN_EMAIL?.trim();
  const password = process.env.DEV_LOGIN_PASSWORD;
  if (!email || !password) {
    return null;
  }
  return { email, password };
}
