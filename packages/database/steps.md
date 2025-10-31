<!-- https://www.prisma.io/docs/getting-started/setup-prisma/add-to-existing-project/relational-databases/install-prisma-client-typescript-postgresql -->

cd database22


yarn prisma init

yarn prisma db pull

mkdir -p prisma/migrations/0_init \
&& yarn prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql \
&& yarn prisma migrate resolve --applied 0_init
