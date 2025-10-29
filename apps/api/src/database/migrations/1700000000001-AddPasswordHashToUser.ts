import { type MigrationInterface, type QueryRunner, TableColumn } from 'typeorm';

export class AddPasswordHashToUser1700000000001 implements MigrationInterface {
  name = `AddPasswordHashToUser1700000000001`;

  public async up(queryRunner: QueryRunner) {
    await queryRunner.addColumn(
      `user`,
      new TableColumn({
        name: `password_hash`,
        type: `varchar`,
        isNullable: false,
        // placeholder; immediately update in seed or app
        default: `'${`$2b$10$zZzZzZzZzZzZzZzZzZzZzO8l9n2XYV6uN2W5JQ7g7Yh4q4oVZbQe`}'`,
      }),
    );
    await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "password_hash" DROP DEFAULT`);
  }

  public async down(queryRunner: QueryRunner) {
    await queryRunner.dropColumn(`user`, `password_hash`);
  }
}
