import type { Knex } from 'knex'
import * as pg from 'pg'

pg.types.setTypeParser(20, parseInt)
pg.types.setTypeParser(1700, parseFloat)
const toCamel = (str: string) => str.replace(/([-_][a-z])/gi, group => group.toUpperCase().replace(`-`, ``).replace(`_`, ``))
const toSnake = (str?: string) => (str == undefined ? undefined : str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`))
const isObject = (source: any) => source === Object(source) && typeof source !== `function` && !(source instanceof Date)

const keysToCamelCase = function (source: any) {
  if (Array.isArray(source)) {
    return source.map(i => keysToCamelCase(i))
  } else if (isObject(source)) {
    return Object.entries(source).reduce((clone, [key, value]) => ({ ...clone, [toCamel(key)]: keysToCamelCase(value) }), {})
  }
  return source
}

const keysToSnakeCase = function (source: any) {
  if (Array.isArray(source)) {
    return source.map(i => keysToSnakeCase(i))
  } else if (isObject(source)) {
    return Object.entries(source).reduce((clone, [key, value]) => ({ ...clone, [toSnake(key)]: keysToSnakeCase(value) }), {})
  }
  return toSnake(source)
}

const connectionConfig: Knex.PgConnectionConfig = {
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT),
  database: process.env.POSTGRES_DATABASE,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: /^true$/i.test(process.env.POSTGRES_SSL),
}

if (connectionConfig.ssl) Object.assign(connectionConfig, { sslmode: `require` })

const pool: Knex.PoolConfig = {
  min: 0,
  max: 20,
  acquireTimeoutMillis: 300000,
  createTimeoutMillis: 300000,
  destroyTimeoutMillis: 300000,
  idleTimeoutMillis: 30000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 2000,
  propagateCreateError: false,
}

const config: { [key: string]: Knex.Config } = {
  development: {
    debug: /^true$/.test(process.env.POSTGRES_DEBUG),
    client: `pg`,
    connection: process.env.VERCEL_POSTGRES_URL || connectionConfig,
    acquireConnectionTimeout: 1000000,
    pool: pool,
    migrations: { extension: `ts`, tableName: `knex_migrations`, directory: `./src/database/migrations` },
    seeds: { extension: `ts`, directory: `./src/database/seeds` },
    wrapIdentifier: (value, origImpl) => origImpl(keysToSnakeCase(value)),
    postProcessResponse: result => keysToCamelCase(result),
  },
  production: {
    debug: false,
    client: `pg`,
    connection: process.env.VERCEL_POSTGRES_URL || connectionConfig,
    acquireConnectionTimeout: 1000000,
    pool: pool,
    migrations: { extension: `ts`, tableName: `knex_migrations`, directory: `./src/database/migrations` },
    seeds: { extension: `ts`, directory: `./src/database/seeds` },
    wrapIdentifier: (value, origImpl) => origImpl(keysToSnakeCase(value)),
    postProcessResponse: result => keysToCamelCase(result),
  },
}

module.exports = config
export default config
