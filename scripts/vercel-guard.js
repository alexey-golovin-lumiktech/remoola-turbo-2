#!/usr/bin/env node
/**
 * Exit immediately on Vercel so that no script in scripts/ runs during deploy.
 * Require this at the top of every script in scripts/ (e.g. require('./vercel-guard.js')).
 */
function isVercel() {
  const v = process.env.VERCEL;
  if (v !== undefined && v !== '' && v !== '0' && String(v).toLowerCase() !== 'false') return true;
  if (process.env.VERCEL_ENV) return true;
  return false;
}
if (isVercel()) process.exit(0);
