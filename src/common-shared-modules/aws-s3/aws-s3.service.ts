import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import AWS, { S3 } from 'aws-sdk'

import { IIdentityResourceModel } from '@wirebill/shared-common/models'

type UploadOneFileResult = Pick<IIdentityResourceModel, `originalname` | `mimetype` | `size` | `bucket` | `key` | `downloadUrl`>

@Injectable()
export class AwsS3Service {
  private readonly logger = new Logger(AwsS3Service.name)
  private readonly bucket: string
  private readonly s3: AWS.S3

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>(`AWS_BUCKET`)
    this.s3 = new AWS.S3()
  }

  async uploadOne(file: Express.Multer.File, tags: S3.Tag[] = []): Promise<UploadOneFileResult | null> {
    try {
      const key = this.originalnameToS3ResourceKey(file)

      const params: AWS.S3.PutObjectRequest = {
        Body: file.stream ?? file.buffer,
        Key: key,
        Bucket: this.bucket,
        ContentType: file.mimetype,
        ContentDisposition: `attachment;filename="${key}"`,
      }

      const uploaded = await this.s3
        .upload(params, {
          params,
          tags,
          queueSize: 4, // optional concurrency configuration
          partSize: 1024 * 1024 * 5, // optional size of each part, in bytes, at least 5MB
        })
        .promise()

      return this.getUploadFileResult(file, uploaded)
    } catch (error) {
      const message = error?.message ?? `Fail to upload file: ${file.originalname}(originalname) ${file.size}bytes`
      this.logger.warn(message)
      return null
    }
  }

  async uploadMany(files: Express.Multer.File[]): Promise<UploadOneFileResult[]> {
    const collected: UploadOneFileResult[] = []
    for (const file of files) {
      const result = await this.uploadOne(file)
      if (result != null) collected.push(result)
    }
    return collected
  }

  private getUploadFileResult(file: Express.Multer.File, uploaded: AWS.S3.ManagedUpload.SendData) {
    return {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      bucket: uploaded.Bucket,
      key: uploaded.Key,
      downloadUrl: uploaded.Location,
    }
  }

  private originalnameToS3ResourceKey = (file: Express.Multer.File): string => {
    // @REASON: Issue with UTF-8 characters in filename https://github.com/expressjs/multer/issues/1104
    return Buffer.from(file.originalname, `latin1`) //
      .toString(`utf8`)
      .replace(/_|-|,/gi, ` `)
      .replace(/\s+/gi, `_`)
  }
}
