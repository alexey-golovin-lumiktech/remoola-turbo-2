#!/usr/bin/env node
const path = require('node:path');
require(path.join(__dirname, 'vercel-guard.js'));

const commandLabel = process.argv.slice(2).join(' ').trim() || 'this command';

function isTruthy(value) {
  if (!value) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized !== '0' && normalized !== 'false' && normalized !== 'no' && normalized !== 'off';
}

const runningInKnownCiProvider = [
  process.env.GITHUB_ACTIONS,
  process.env.GITLAB_CI,
  process.env.BUILDKITE,
  process.env.CIRCLECI,
  process.env.JENKINS_URL,
  process.env.TEAMCITY_VERSION,
  process.env.TRAVIS,
  process.env.BITBUCKET_COMMIT,
  process.env.TF_BUILD,
].some(isTruthy);
const runningOnVercel = isTruthy(process.env.VERCEL) || Boolean(process.env.VERCEL_ENV);

if (runningInKnownCiProvider || runningOnVercel) {
  const flags = [
    runningInKnownCiProvider ? `CI_PROVIDER=1` : null,
    runningOnVercel ? `VERCEL=${process.env.VERCEL ?? `1`}` : null,
  ].filter(Boolean);

  console.error(
    `[local-only] ${commandLabel} is blocked outside local development (${flags.join(', ')}).`,
  );
  console.error(
    `[local-only] Allowed only for local manual runs or local git hooks (e.g. Husky pre-commit).`,
  );
  process.exit(1);
}

