# Remoola Outbox Scheduler

Cloudflare Worker Cron that drains the API v2 reversal notification outbox every minute.

## Runtime

- Cron: `* * * * *` in UTC.
- Target: `OUTBOX_DRAIN_URL` from `wrangler.toml`.
- Batch size: `OUTBOX_DRAIN_LIMIT`, defaults to `25` in `wrangler.toml`.
- Secret: `CRON_SECRET`, stored as a Cloudflare Worker secret and matching the API v2 Vercel environment variable.
- Secret: `VERCEL_AUTOMATION_BYPASS_SECRET`, stored as a Cloudflare Worker secret and matching the Vercel
  deployment protection bypass secret.
- Logs: Workers Logs are enabled via `[observability]` in `wrangler.toml`.

## Commands

```bash
yarn workspace @remoola/outbox-scheduler typecheck
yarn workspace @remoola/outbox-scheduler deploy
```

For local scheduled-event testing:

```bash
yarn workspace @remoola/outbox-scheduler dev --test-scheduled
curl "http://localhost:8787/__scheduled"
```

Wrangler exposes `/__scheduled` for JavaScript and TypeScript Workers. The
`/cdn-cgi/handler/scheduled` test route is for Python Workers.

## CI deployment

`.github/workflows/deploy-outbox-scheduler.yml` deploys this Worker from `main` when scheduler files change.

Required GitHub repository secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

The Cloudflare token should be scoped to the target account and allow Workers script deployment.

Required Cloudflare Worker secrets:

- `CRON_SECRET`
- `VERCEL_AUTOMATION_BYPASS_SECRET`

The CI workflow fails before deploy if either Worker secret is missing.
