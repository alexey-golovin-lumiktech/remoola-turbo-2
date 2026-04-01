import { createReadStream } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';

import { errorCodes } from '@remoola/shared-constants';

import { envs } from '../../../envs';

import type { Readable } from 'stream';

@Injectable()
export class FileStorageService {
  private readonly useS3 = !!envs.AWS_BUCKET; // auto-switch mode

  private s3: S3Client | null = null;

  constructor() {
    if (envs.VERCEL !== 0 && !envs.AWS_BUCKET) {
      throw new InternalServerErrorException(
        `AWS_BUCKET (S3) is required for file uploads on Vercel. Local filesystem is read-only.`,
      );
    }
    if (this.useS3) {
      const configuration = {
        region: envs.AWS_REGION,
        credentials: {
          accessKeyId: envs.AWS_ACCESS_KEY_ID!,
          secretAccessKey: envs.AWS_SECRET_ACCESS_KEY!,
        },
      };
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
    backendBaseUrl?: string,
  ) {
    let key = originalName.replace(/\s+/g, `_`);
    if (folder) key = `${folder}/${key}`;

    if (this.useS3) {
      return this.uploadS3(buffer, key, mimetype);
    } else {
      return this.uploadLocal(buffer, key, backendBaseUrl);
    }
  }

  async openDownloadStream({
    bucket,
    key,
    originalName,
    mimetype,
  }: {
    bucket: string;
    key: string;
    originalName: string;
    mimetype?: string | null;
  }): Promise<{
    stream: Readable;
    filename: string;
    contentType: string | null;
    contentLength: number | null;
  }> {
    if (bucket === `local`) {
      const filePath = this.resolveLocalFilePath(key);

      return {
        stream: createReadStream(filePath),
        filename: originalName,
        contentType: mimetype ?? null,
        contentLength: null,
      };
    }

    const response = await this.s3!.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
    const stream = response.Body as Readable | undefined;

    if (!stream) {
      throw new NotFoundException(errorCodes.DOCUMENT_ACCESS_DENIED);
    }

    return {
      stream,
      filename: originalName,
      contentType: response.ContentType ?? mimetype ?? null,
      contentLength: response.ContentLength ?? null,
    };
  }

  private async uploadLocal(buffer: Buffer, key: string, backendBaseUrl?: string) {
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

    const fallbackBaseUrl = new URL(`/api`, `http://127.0.0.1:${envs.PORT}`).toString().replace(/\/api$/, ``);
    const resolvedBaseUrl = backendBaseUrl ?? fallbackBaseUrl;

    return {
      bucket: `local`,
      key,
      downloadUrl: new URL(`/uploads/${key}`, resolvedBaseUrl).toString(),
    };
  }

  private resolveLocalFilePath(key: string): string {
    return join(process.cwd(), `uploads`, key);
  }

  private async uploadS3(buffer: Buffer, key: string, mimetype: string) {
    const bucket = envs.AWS_BUCKET!;

    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
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
