import { HeadObjectCommand, HeadObjectCommandOutput, PutObjectCommand, PutObjectCommandInput, S3Client } from '@aws-sdk/client-s3'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { IResourceCreate } from '@wirebill/shared-common/dtos'

@Injectable()
export class AwsS3Service {
  private readonly logger = new Logger(AwsS3Service.name)
  private readonly bucket: string
  private readonly region: string
  private readonly s3Client = new S3Client()

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>(`AWS_BUCKET`)
    this.region = this.configService.get<string>(`AWS_REGION`)
  }

  private checkExists(key: IResourceCreate[`key`]): Promise<HeadObjectCommandOutput | null> {
    return this.s3Client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key })).catch(() => null)
  }

  async uploadOne(file: Express.Multer.File): Promise<IResourceCreate | null> {
    try {
      const key = this.originalnameToS3ResourceKey(file)
      const exist = await this.checkExists(key)

      if (exist == null || exist.ContentLength != file.size || exist.ContentType != file.mimetype) {
        const params: PutObjectCommandInput = {
          Body: file.stream ?? file.buffer,
          Key: key,
          Bucket: this.bucket,
          ContentLength: file.size,
          ContentType: file.mimetype,
          ContentDisposition: `attachment;filename="${key}"`,
        }
        this.s3Client.send(new PutObjectCommand(params))
      } else this.logger.log(`Skip uploading for file: ${file.originalname} (reason: ALREADY_EXIST)`)

      return this.getUploadFileResult(file, key)
    } catch (error) {
      const message = `Fail to upload file: ${file.originalname}(originalname) ${file.size}bytes`
      this.logger.warn(error?.message || message)
      return null
    }
  }

  async uploadMany(files: Express.Multer.File[]): Promise<IResourceCreate[]> {
    const collected: IResourceCreate[] = []
    for (const file of files) {
      const result = await this.uploadOne(file)
      if (result != null) collected.push(result)
    }
    return collected
  }

  private getUploadFileResult(file: Express.Multer.File, key: IResourceCreate[`key`]): Omit<IResourceCreate, `access`> {
    return {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      bucket: this.bucket,
      key: key,
      downloadUrl: this.getResourceDownloadUrl(key),
    }
  }

  private originalnameToS3ResourceKey = (file: Express.Multer.File): string => {
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
