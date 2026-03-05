export const DEV_CREDENTIALS = {
  email: `dev@remoola.com`,
  password: `DevPassword123!`,
  testCards: {
    visa: `4242424242424242`,
    mastercard: `5555555555554444`,
    amex: `378282246310005`,
    discover: `6011111111111117`,
  },
  testBankAccount: {
    accountNumber: `000123456789`,
    routingNumber: `110000000`,
  },
} as const;

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === `development`;
}

export function getDevCredentials() {
  if (!isDevelopment()) {
    return null;
  }
  return DEV_CREDENTIALS;
}

export function shouldShowDevTools(): boolean {
  return isDevelopment() && typeof window !== `undefined`;
}
