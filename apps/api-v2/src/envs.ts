import { buildDatabaseUrl, deriveJwtTtls } from './envs-derived';
import {
  assertNgrokConfiguration,
  assertProductionLikePolicy,
  isBootstrapSeedProcess,
  isProductionLikeNodeEnv,
} from './envs-policy';
import { ENVIRONMENT, environments, schema } from './envs-schema';

const parsed = schema.safeParse(process.env);
if (!parsed.success) throw new Error(JSON.stringify(parsed.error, null, 2));

const productionLike = isProductionLikeNodeEnv(parsed.data.NODE_ENV);
const effective = {
  ...parsed.data,
  DATABASE_URL: buildDatabaseUrl(parsed.data),
  SWAGGER_ENABLED: parsed.data.SWAGGER_ENABLED ?? !productionLike,
  PUBLIC_DETAILED_HEALTH_ENABLED: parsed.data.PUBLIC_DETAILED_HEALTH_ENABLED ?? !productionLike,
  PUBLIC_MAIL_TRANSPORT_HEALTH_ENABLED: parsed.data.PUBLIC_MAIL_TRANSPORT_HEALTH_ENABLED ?? !productionLike,
  HEALTH_TEST_EMAIL_ENABLED: parsed.data.HEALTH_TEST_EMAIL_ENABLED ?? !productionLike,
  NGROK_ENABLED: parsed.data.NGROK_ENABLED ?? false,
};

assertNgrokConfiguration(effective);
assertProductionLikePolicy(effective, {
  isBootstrapSeedEntry: isBootstrapSeedProcess(process.argv),
});
process.env.DATABASE_URL = effective.DATABASE_URL;

const { JWT_ACCESS_TOKEN_EXPIRES_IN, JWT_REFRESH_TOKEN_EXPIRES_IN, JWT_ACCESS_TTL_SECONDS, JWT_REFRESH_TTL_SECONDS } =
  deriveJwtTtls(effective);

export const envs = {
  ...effective,
  ENVIRONMENT,
  environments,
  isProductionLike: productionLike,
  JWT_ACCESS_TOKEN_EXPIRES_IN,
  JWT_REFRESH_TOKEN_EXPIRES_IN,
  JWT_ACCESS_TTL_SECONDS,
  JWT_REFRESH_TTL_SECONDS,
};
