import { S3Client } from '@aws-sdk/client-s3';
import { Injectable, type OnApplicationShutdown, type OnModuleDestroy } from '@nestjs/common';

import { envs } from '../../../envs';

export const S3_CLIENT = Symbol(`S3_CLIENT`);

@Injectable()
export class S3ClientProvider implements OnModuleDestroy, OnApplicationShutdown {
  private readonly client: S3Client | null;
  private destroyed = false;

  constructor() {
    this.client = envs.AWS_BUCKET
      ? new S3Client({
          region: envs.AWS_REGION,
          credentials: {
            accessKeyId: envs.AWS_ACCESS_KEY_ID,
            secretAccessKey: envs.AWS_SECRET_ACCESS_KEY,
          },
        })
      : null;
  }

  getClient(): S3Client | null {
    return this.client;
  }

  onModuleDestroy(): void {
    this.destroyClient();
  }

  onApplicationShutdown(): void {
    this.destroyClient();
  }

  private destroyClient(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.client?.destroy();
  }
}

export const s3ClientProvider = {
  provide: S3_CLIENT,
  useFactory: (provider: S3ClientProvider): S3Client | null => provider.getClient(),
  inject: [S3ClientProvider],
};
