import { envSchema } from './schema';

const currentEnv = loadAndValidate(`initial`);

function loadAndValidate(mode: `initial` | `reload`) {
  const parsed = envSchema.parse(process.env);
  // In dev only, log that env loaded; never log parsed values (may contain secrets)
  if (parsed.ENABLE_DEBUG && parsed.NODE_ENV === `development`) {
    const keys = Object.keys(parsed).sort();
    process.stderr.write(`[env] ${mode} loaded (keys: ${keys.length})\n`);
  }
  return parsed;
}

export const parsedEnvs = new Proxy(currentEnv, {
  get(_t, p: string) {
    return currentEnv[p as keyof typeof currentEnv];
  },
});
