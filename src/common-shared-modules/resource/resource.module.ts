import { Module } from '@nestjs/common'

import { AwsS3Module } from '../aws-s3/aws-s3.module'

import { ResourceRepository } from './resource.repository'
import { ResourceService } from './resource.service'

@Module({
  imports: [AwsS3Module],
  providers: [ResourceRepository, ResourceService],
  exports: [ResourceRepository, ResourceService],
})
export class ResourceModule {}
