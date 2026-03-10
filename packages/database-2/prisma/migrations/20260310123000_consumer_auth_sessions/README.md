## Why

Implements the cookie-auth blueprint session requirements for consumer auth:

- database-backed sessions
- hashed refresh token storage
- refresh rotation lineage (`session_family_id`, `replaced_by_id`)
- revocation metadata (`revoked_at`, `invalidated_reason`)

## Safety

- additive migration only (new table + indexes)
- no destructive changes to existing auth tables
- allows gradual migration from legacy `access_refresh_token` flows
