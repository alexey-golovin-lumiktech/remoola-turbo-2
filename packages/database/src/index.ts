import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/index.js';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const datasourceUrl = `postgresql://wirebill:wirebill@127.0.0.1:5433/wirebill`;

export const prisma = globalForPrisma.prisma || new PrismaClient({ datasourceUrl });

if (process.env.NODE_ENV !== `production`) globalForPrisma.prisma = prisma;

export * from '../generated/prisma/index.js'; // exports generated types from prisma
