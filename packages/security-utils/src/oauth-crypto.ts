import * as crypto from 'crypto';

/** OAuth/OIDC helpers for state, nonce, token hashing, and PKCE. */
export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString(`base64url`);
}

export function signOAuthState(state: string, secret: string): string {
  return crypto.createHmac(`sha256`, secret).update(state).digest(`base64url`);
}

/** Hash the signed state token before storing or looking it up. */
export function hashOAuthState(stateToken: string): string {
  return crypto.createHash(`sha256`).update(stateToken).digest(`base64url`);
}

/** Store or compare tokens without persisting the raw value. */
export function hashTokenToHex(token: string): string {
  return crypto.createHash(`sha256`).update(token).digest(`hex`);
}

export function generateOAuthNonce(): string {
  return crypto.randomBytes(16).toString(`base64url`);
}

export function generatePKCEVerifier(): string {
  return crypto.randomBytes(32).toString(`base64url`);
}

export function generatePKCEChallenge(verifier: string): string {
  return crypto.createHash(`sha256`).update(verifier).digest(`base64url`);
}

export const oauthCrypto = {
  generateOAuthState,
  signOAuthState,
  hashOAuthState,
  hashTokenToHex,
  generateOAuthNonce,
  generatePKCEVerifier,
  generatePKCEChallenge,
};
