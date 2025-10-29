import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class ExtendRoleEnum1700000000002 implements MigrationInterface {
  name = `ExtendRoleEnum1700000000002`;

  public async up(queryRunner: QueryRunner) {
    await queryRunner.query(`ALTER TYPE "public"."user_role_enum" ADD VALUE IF NOT EXISTS 'superadmin'`);
  }

  public async down() {
    /* no-op: enum value removal is unsafe */
  }
}
