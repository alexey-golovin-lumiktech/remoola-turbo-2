import { randomUUID } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';

import { envs } from '../../../envs';

@Injectable()
export class FileStorageService {
  private readonly useS3 = false; // !!envs.AWS_BUCKET; auto-switch mode
  private s3: S3Client | null = null;

  constructor() {
    if (this.useS3) {
      this.s3 = new S3Client({
        region: envs.AWS_REGION,
        credentials: {
          accessKeyId: envs.AWS_ACCESS_KEY_ID!,
          secretAccessKey: envs.AWS_SECRET_ACCESS_KEY!,
        },
      });
    }
  }

  /**
   * Upload buffer content.
   * Automatically chooses local mode OR AWS S3 mode.
   *
   * @returns { bucket, key, downloadUrl }
   */
  async upload(
    { buffer, originalname, mimetype }: { buffer: Buffer; originalname: string; mimetype: string },
    backendHost,
  ) {
    const key = `${randomUUID()}-${originalname.replace(/\s+/g, `_`)}`;

    if (this.useS3) {
      return this.uploadS3(buffer, key, mimetype);
    } else {
      return this.uploadLocal(buffer, key, backendHost);
    }
  }

  private async uploadLocal(buffer: Buffer, key: string, backendHost) {
    const localFolder = join(process.cwd(), `uploads`);

    await mkdir(localFolder, { recursive: true });

    const filePath = join(localFolder, key);
    await writeFile(filePath, buffer);

    return {
      bucket: `local`,
      key,
      downloadUrl: `http://${backendHost}/uploads/${key}`,
    };
  }

  private async uploadS3(buffer: Buffer, key: string, mimetype: string) {
    const bucket = envs.AWS_BUCKET!;

    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
      ACL: `public-read`,
    });

    await this.s3!.send(cmd);

    const downloadUrl = `https://${bucket}.s3.${envs.AWS_REGION}.amazonaws.com/${key}`;

    return {
      bucket,
      key,
      downloadUrl,
    };
  }
}
