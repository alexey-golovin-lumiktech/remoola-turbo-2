import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';

import { envs } from '../../../envs';

@Injectable()
export class FileStorageService {
  private readonly useS3 = !!envs.AWS_BUCKET; // auto-switch mode
  private s3: S3Client | null = null;

  constructor() {
    if (this.useS3) {
      const configuration = {
        region: envs.AWS_REGION,
        credentials: {
          accessKeyId: envs.AWS_ACCESS_KEY_ID!,
          secretAccessKey: envs.AWS_SECRET_ACCESS_KEY!,
        },
      };
      console.log(`\n************************************`);
      console.log(`useS3 configuration`, configuration);
      console.log(`envs.AWS_REGION`, envs.AWS_REGION);
      console.log(`************************************\n`);
      this.s3 = new S3Client(configuration);
    }
  }

  async upload(
    {
      buffer,
      originalName,
      mimetype,
      folder,
    }: { buffer: Buffer; originalName: string; mimetype: string; folder?: string },
    backendHost,
  ) {
    let key = originalName.replace(/\s+/g, `_`);
    if (folder) key = `${folder}/${key}`;

    if (this.useS3) {
      return this.uploadS3(buffer, key, mimetype);
    } else {
      return this.uploadLocal(buffer, key, backendHost);
    }
  }

  private async uploadLocal(buffer: Buffer, key: string, backendHost) {
    let localFolder = join(process.cwd(), `uploads`);
    if (key.includes(`/`)) {
      const parts = key.split(`/`);
      parts.pop();
      const subfolder = parts.join(`/`);
      localFolder = join(localFolder, subfolder);
    }

    await mkdir(localFolder, { recursive: true });

    const filePath = join(localFolder, key.split(`/`).pop());
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
    });
    console.log(`\n************************************`);
    console.log(`envs.AWS_BUCKET`, envs.AWS_BUCKET);
    console.log(`envs.AWS_REGION`, envs.AWS_REGION);
    console.log(`************************************\n`);

    await this.s3!.send(cmd);

    const downloadUrl = `https://${bucket}.s3.${envs.AWS_REGION}.amazonaws.com/${key}`;

    return {
      bucket,
      key,
      downloadUrl,
    };
  }
}
