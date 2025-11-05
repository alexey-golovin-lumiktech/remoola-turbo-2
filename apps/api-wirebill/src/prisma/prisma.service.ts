import { Global, INestApplication, Injectable, OnModuleInit } from '@nestjs/common';

import { PrismaClient } from '@remoola/database';

@Global()
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    await app.close();
    await this.$disconnect();
  }
}
