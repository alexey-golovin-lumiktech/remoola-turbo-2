## Why

Cleanup after `20260317120000_reset_password_token_hash`: remove the legacy plaintext `token` column and its index so reset tokens exist only as hashes in the DB.

## What this migration does

- Drops index `reset_password_token_idx`.
- Drops column `token` from `reset_password`.

Run only after:

1. `20260317120000_reset_password_token_hash` has been applied.
2. The application has been deployed and uses only `token_hash` for forgot-password (no reads/writes of `token`).

## Safety

- Destructive: plaintext token data is removed and cannot be recovered.
- No rollback of token data; restoring the column would require re-adding it without restoring original values.
