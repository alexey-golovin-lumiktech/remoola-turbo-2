import { Injectable } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { type ConsumerActionLogMetadata } from './consumer-action-log.service';
import { PrismaService } from './prisma.service';

type CreateActionLogParams = {
  deviceId: string;
  consumerId: string | null;
  action: string;
  resource: string | null;
  resourceId: string | null;
  metadata: ConsumerActionLogMetadata;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
};

@Injectable()
export class ConsumerActionLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  createActionLog(params: CreateActionLogParams) {
    return this.prisma.consumerActionLogModel.create({
      data: {
        deviceId: params.deviceId,
        consumerId: params.consumerId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        metadata: params.metadata === null ? null : (params.metadata as Prisma.InputJsonValue),
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        correlationId: params.correlationId,
      },
    });
  }
}
