import { PrismaClient } from '@remoola/database-2';

import { isUnsafeEnvironment, parseOptions } from './options';
import { seedAllTables } from './seed';

async function main(): Promise<void> {
  const options = parseOptions(process.argv);

  if (isUnsafeEnvironment(process.env.NODE_ENV)) {
    throw new Error(`Refusing to run db fixtures in NODE_ENV=production.`);
  }

  if (options.mode === `refresh` && !options.confirm) {
    throw new Error(`Refresh mode truncates tables. Re-run with --confirm to proceed.`);
  }

  const prisma = new PrismaClient();
  try {
    const summary = await seedAllTables(prisma, options);
    process.stdout.write(JSON.stringify(summary, null, 2) + `\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
