import { type MigrationInterface, type QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class InitCoreSchema1700000000000 implements MigrationInterface {
  name = `InitCoreSchema1700000000000`;

  public async up(queryRunner: QueryRunner) {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    `);

    await queryRunner.createTable(
      new Table({
        name: `user`,
        columns: [
          { name: `id`, type: `uuid`, isPrimary: true, isGenerated: true, generationStrategy: `uuid` },
          { name: `email`, type: `varchar`, isUnique: true },
          { name: `name`, type: `varchar` },
          { name: `role`, type: `enum`, enum: [`client`, `admin`], default: `'client'` },
          { name: `created_at`, type: `timestamptz`, default: `now()` },
          { name: `updated_at`, type: `timestamptz`, default: `now()` },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: `contractor`,
        columns: [
          { name: `id`, type: `uuid`, isPrimary: true, isGenerated: true, generationStrategy: `uuid` },
          { name: `name`, type: `varchar` },
          { name: `email`, type: `varchar`, isNullable: true },
          { name: `phone`, type: `varchar`, isNullable: true },
          { name: `created_at`, type: `timestamptz`, default: `now()` },
          { name: `updated_at`, type: `timestamptz`, default: `now()` },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: `contract`,
        columns: [
          { name: `id`, type: `uuid`, isPrimary: true, isGenerated: true, generationStrategy: `uuid` },
          { name: `client_id`, type: `uuid` },
          { name: `contractor_id`, type: `uuid` },
          { name: `rate_cents`, type: `int` },
          { name: `rate_unit`, type: `enum`, enum: [`hour`, `fixed`], default: `'hour'` },
          { name: `status`, type: `enum`, enum: [`draft`, `signature`, `active`, `archived`], default: `'draft'` },
          { name: `last_activity_at`, type: `timestamptz`, isNullable: true },
          { name: `created_at`, type: `timestamptz`, default: `now()` },
          { name: `updated_at`, type: `timestamptz`, default: `now()` },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: [`client_id`],
            referencedColumnNames: [`id`],
            referencedTableName: `user`,
            onDelete: `CASCADE`,
          }),
          new TableForeignKey({
            columnNames: [`contractor_id`],
            referencedColumnNames: [`id`],
            referencedTableName: `contractor`,
            onDelete: `CASCADE`,
          }),
        ],
      }),
    );
    await queryRunner.createIndex(`contract`, new TableIndex({ columnNames: [`status`] }));

    await queryRunner.createTable(
      new Table({
        name: `payment`,
        columns: [
          { name: `id`, type: `uuid`, isPrimary: true, isGenerated: true, generationStrategy: `uuid` },
          { name: `contract_id`, type: `uuid` },
          { name: `amount_cents`, type: `int` },
          { name: `currency`, type: `varchar`, length: `3`, default: `'USD'` },
          { name: `method`, type: `varchar`, default: `'ACH'` },
          { name: `status`, type: `enum`, enum: [`pending`, `completed`, `failed`], default: `'pending'` },
          { name: `paid_at`, type: `timestamptz`, isNullable: true },
          { name: `created_at`, type: `timestamptz`, default: `now()` },
          { name: `updated_at`, type: `timestamptz`, default: `now()` },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: [`contract_id`],
            referencedTableName: `contract`,
            referencedColumnNames: [`id`],
            onDelete: `CASCADE`,
          }),
        ],
      }),
    );
    await queryRunner.createIndex(`payment`, new TableIndex({ columnNames: [`status`] }));

    await queryRunner.createTable(
      new Table({
        name: `document`,
        columns: [
          { name: `id`, type: `uuid`, isPrimary: true, isGenerated: true, generationStrategy: `uuid` },
          { name: `contract_id`, type: `uuid` },
          { name: `name`, type: `varchar` },
          { name: `type`, type: `enum`, enum: [`invoice`, `contract`, `attestation`, `other`], default: `'other'` },
          { name: `file_url`, type: `varchar`, isNullable: true },
          { name: `size_bytes`, type: `int`, isNullable: true },
          { name: `created_at`, type: `timestamptz`, default: `now()` },
          { name: `updated_at`, type: `timestamptz`, default: `now()` },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: [`contract_id`],
            referencedTableName: `contract`,
            referencedColumnNames: [`id`],
            onDelete: `CASCADE`,
          }),
        ],
      }),
    );
    await queryRunner.createIndex(`document`, new TableIndex({ columnNames: [`type`] }));

    await queryRunner.createTable(
      new Table({
        name: `compliance_checklist`,
        columns: [
          { name: `id`, type: `uuid`, isPrimary: true, isGenerated: true, generationStrategy: `uuid` },
          { name: `user_id`, type: `uuid`, isUnique: true },
          { name: `w9_ready`, type: `boolean`, default: false },
          { name: `kyc_in_review`, type: `boolean`, default: false },
          { name: `bank_verified`, type: `boolean`, default: false },
          { name: `created_at`, type: `timestamptz`, default: `now()` },
          { name: `updated_at`, type: `timestamptz`, default: `now()` },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: [`user_id`],
            referencedTableName: `user`,
            referencedColumnNames: [`id`],
            onDelete: `CASCADE`,
          }),
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner) {
    await queryRunner.dropTable(`compliance_checklist`);
    await queryRunner.dropIndex(`document`, `IDX_document_type`).catch(() => {});
    await queryRunner.dropTable(`document`);
    await queryRunner.dropIndex(`payment`, `IDX_payment_status`).catch(() => {});
    await queryRunner.dropTable(`payment`);
    await queryRunner.dropIndex(`contract`, `IDX_contract_status`).catch(() => {});
    await queryRunner.dropTable(`contract`);
    await queryRunner.dropTable(`contractor`);
    await queryRunner.dropTable(`user`);
  }
}
