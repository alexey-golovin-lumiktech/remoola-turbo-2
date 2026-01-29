import { envSchema } from './schema';

const currentEnv = loadAndValidate(`initial`);

function loadAndValidate(mode: `initial` | `reload`) {
  const parsed = envSchema.parse(process.env);
  if (parsed.ENABLE_DEBUG && parsed.NODE_ENV === `development`) {
    console.debug(`[${mode}] ✅ Loaded environment:`, parsed);
  }
  return parsed;
}

export const parsedEnvs = new Proxy(currentEnv, {
  get(_t, p: string) {
    return currentEnv[p as keyof typeof currentEnv];
  },
});
