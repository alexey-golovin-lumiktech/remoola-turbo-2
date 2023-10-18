import { Knex } from 'knex'

import { CommonConstraints } from './migration-utils'

// @ACCORDING_TO_ARTICLE_ON: https://dev.to/yogski/dealing-with-enum-type-in-postgresql-1j3g

export async function up(knex: Knex): Promise<void> {
  for (const type of Object.values(CommonConstraints).sort()) {
    await knex.schema.raw(`DROP TYPE IF EXISTS ${type.name}`)
    await knex.schema.raw(`CREATE TYPE ${type.name} AS ENUM (${type.values.map(i => `'${i}'`).join(`,`)});`)
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const type of Object.values(CommonConstraints).sort()) {
    await knex.schema.raw(`DROP TYPE IF EXISTS ${type.name}`)
  }
}
