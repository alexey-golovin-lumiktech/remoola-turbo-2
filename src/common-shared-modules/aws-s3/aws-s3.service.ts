import { HeadObjectCommand, HeadObjectCommandOutput, PutObjectCommand, PutObjectCommandInput, S3Client } from '@aws-sdk/client-s3'
import { Injectable, Logger } from '@nestjs/common'

import { IResourceCreate } from '@wirebill/shared-common/dtos'

import { check, envs } from '../../envs'

@Injectable()
export class AwsS3Service {
  private readonly logger = new Logger(AwsS3Service.name)
  private readonly bucket: string
  private readonly region: string
  private readonly s3Client: S3Client

  constructor() {
    check(`AWS_BUCKET`, `AWS_REGION`)

    this.bucket = envs.AWS_BUCKET
    this.region = envs.AWS_REGION
    this.s3Client = new S3Client({ region: this.region })
  }

  private async checkExists(key: IResourceCreate[`key`]): Promise<HeadObjectCommandOutput | null> {
    try {
      return await this.s3Client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }))
    } catch {
      return null
    }
  }

  async uploadOne(file: Express.Multer.File): Promise<IResourceCreate | null> {
    try {
      const key = this.originalnameToS3ResourceKey(file)
      const exist = await this.checkExists(key)

      if (!exist || exist.ContentLength !== file.size || exist.ContentType !== file.mimetype) {
        const params: PutObjectCommandInput = {
          Body: file.stream ?? file.buffer,
          Key: key,
          Bucket: this.bucket,
          ContentLength: file.size,
          ContentType: file.mimetype,
          ContentDisposition: `attachment;filename="${key}"`,
        }
        await this.s3Client.send(new PutObjectCommand(params))
      } else {
        this.logger.log(`Skip uploading for file: ${file.originalname} (reason: ALREADY_EXIST)`)
      }

      return this.getUploadFileResult(file, key)
    } catch (error: any) {
      this.logger.warn(`Fail to upload file: ${file.originalname} (${file.size} bytes) - ${error.message}`)
      return null
    }
  }

  async uploadMany(files: Express.Multer.File[]): Promise<IResourceCreate[]> {
    const results: IResourceCreate[] = []
    for (const file of files) {
      const result = await this.uploadOne(file)
      if (result) results.push(result)
    }
    return results
  }

  private getUploadFileResult(file: Express.Multer.File, key: IResourceCreate[`key`]): IResourceCreate {
    return {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      bucket: this.bucket,
      key: key,
      downloadUrl: this.getResourceDownloadUrl(key),
    }
  }

  private originalnameToS3ResourceKey(file: Express.Multer.File): string {
    // @IMPORTANT_NOTE: Issue with UTF-8 characters in filename https://github.com/expressjs/multer/issues/1104
    return Buffer.from(file.originalname, `latin1`) //
      .toString(`utf8`)
      .replace(/_|-|,/gi, ` `)
      .replace(/\s+/gi, `_`)
  }

  private getResourceDownloadUrl(key: IResourceCreate[`key`]): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`
  }
}
