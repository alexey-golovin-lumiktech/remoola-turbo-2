import * as crypto from 'crypto';

/**
 * OAuth 2.0 / OIDC cryptographic helpers.
 *
 * These functions provide secure primitives for OAuth flows including:
 * - PKCE (RFC 7636) code verifier/challenge generation
 * - State token generation with HMAC signatures
 * - Nonce generation for replay protection
 */

/**
 * Generate a cryptographically secure OAuth state token (base64url-encoded random bytes).
 * This is the random portion before HMAC signing.
 */
export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString(`base64url`);
}

/**
 * Sign an OAuth state token using HMAC-SHA256.
 * Returns the signature as base64url-encoded string.
 *
 * @param state - The state token to sign
 * @param secret - The secret key for HMAC (e.g., SECURE_SESSION_SECRET)
 */
export function signOAuthState(state: string, secret: string): string {
  return crypto.createHmac(`sha256`, secret).update(state).digest(`base64url`);
}

/**
 * Hash an OAuth state token using SHA-256.
 * Used to create a storage key for the state record.
 *
 * @param stateToken - The full state token (including signature)
 */
export function hashOAuthState(stateToken: string): string {
  return crypto.createHash(`sha256`).update(stateToken).digest(`base64url`);
}

/**
 * Generate a cryptographically secure nonce for OAuth/OIDC.
 * Used for replay protection in ID tokens.
 */
export function generateOAuthNonce(): string {
  return crypto.randomBytes(16).toString(`base64url`);
}

/**
 * Generate a PKCE code verifier (RFC 7636).
 * Returns a base64url-encoded random string (43-128 characters).
 */
export function generatePKCEVerifier(): string {
  return crypto.randomBytes(32).toString(`base64url`);
}

/**
 * Generate a PKCE code challenge from a code verifier (RFC 7636).
 * Uses SHA-256 hash with base64url encoding (S256 method).
 *
 * @param verifier - The PKCE code verifier
 */
export function generatePKCEChallenge(verifier: string): string {
  return crypto.createHash(`sha256`).update(verifier).digest(`base64url`);
}

/**
 * Consolidated OAuth crypto utilities namespace.
 */
export const oauthCrypto = {
  generateOAuthState,
  signOAuthState,
  hashOAuthState,
  generateOAuthNonce,
  generatePKCEVerifier,
  generatePKCEChallenge,
};
