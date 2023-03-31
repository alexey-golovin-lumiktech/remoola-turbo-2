import type { Knex } from 'knex'
import * as dotenv from 'dotenv'
import * as pg from 'pg'
import { constants } from './src/constants'
dotenv.config({ path: constants.ENV_FILE_PATH })

pg.types.setTypeParser(20, parseInt)
const toCamel = (str) => str.replace(/([-_][a-z])/gi, (group) => group.toUpperCase().replace(`-`, ``).replace(`_`, ``))
const toSnake = (str) => (str == undefined ? undefined : str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`))
const isObject = (source) => source === Object(source) && typeof source !== `function` && !(source instanceof Date)

const keysToCamelCase = function (source) {
  if (Array.isArray(source)) {
    return source.map((i) => keysToCamelCase(i))
  } else if (isObject(source)) {
    return Object.entries(source).reduce((clone, [key, value]) => ({ ...clone, [toCamel(key)]: keysToCamelCase(value) }), {})
  }
  return source
}

const keysToSnakeCase = function (source) {
  if (Array.isArray(source)) {
    return source.map((i) => keysToSnakeCase(i))
  } else if (isObject(source)) {
    return Object.entries(source).reduce((clone, [key, value]) => ({ ...clone, [toSnake(key)]: keysToSnakeCase(value) }), {})
  }
  return toSnake(source)
}

const config: { [key: string]: Knex.Config } = {
  development: {
    debug: /^true$/.test(process.env.POSTGRES_LOGGING) ?? false,
    client: `pg`,
    connection: {
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT),
      database: process.env.POSTGRES_DB,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD
    },
    migrations: { extension: `ts`, tableName: `knex_migrations`, directory: `./src/migrations` },
    seeds: { extension: `ts`, directory: `./src/seeds` },
    wrapIdentifier: (value, origImpl) => origImpl(keysToSnakeCase(value)),
    postProcessResponse: (result) => keysToCamelCase(result)
  },
  production: {
    debug: false,
    client: `pg`,
    connection: {
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT),
      database: process.env.POSTGRES_DB,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD
    },
    pool: { min: 2, max: 10 },
    migrations: { extension: `ts`, tableName: `knex_migrations`, directory: `./src/migrations` },
    seeds: { extension: `ts`, directory: `./src/seeds` },
    wrapIdentifier: (value, origImpl) => origImpl(keysToSnakeCase(value)),
    postProcessResponse: (result) => keysToCamelCase(result)
  }
}

module.exports = config
