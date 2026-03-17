## Why

Consumer forgot-password flow stores reset tokens; storing plaintext tokens in the DB is a security risk. This migration introduces a SHA-256 hex hash column so only the hash is persisted; the app compares tokens via `hashTokenToHex()` from `@remoola/security-utils`.

## What this migration does

- **Additive only:** adds `token_hash` (TEXT) to `reset_password`.
- Backfills `token_hash` from existing `token` using `encode(digest("token", 'sha256'), 'hex')` (pgcrypto).
- Sets `token_hash` NOT NULL and creates index `reset_password_token_hash_idx`.
- Does **not** drop `token` or the old index; that happens in the follow-up migration `20260317120001_drop_reset_password_token` after the app uses only `token_hash`.

## Safety

- Additive-first (governance R009 / GATE-008): no destructive changes in this migration.
- Backfill assumes every row has non-NULL `token` (current schema); table is typically small.
- Run `20260317120001_drop_reset_password_token` only after deploying the app that reads/writes `token_hash` only.

## Rollback

Reverting would require manual `DROP COLUMN token_hash` and `DROP INDEX reset_password_token_hash_idx`. Prefer fixing forward; the next migration drops `token` and is irreversible.
