import { Injectable } from '@nestjs/common';

import { PrismaService } from './prisma.service';

@Injectable()
export class ConsumerActionLogQuery {
  constructor(private readonly prisma: PrismaService) {}

  findTimelineByDeviceId(deviceId: string, limit: number) {
    return this.prisma.consumerActionLogModel.findMany({
      where: { deviceId },
      orderBy: { createdAt: `desc` },
      take: limit,
    });
  }

  findTimelineByConsumerId(consumerId: string, limit: number) {
    return this.prisma.consumerActionLogModel.findMany({
      where: { consumerId },
      orderBy: { createdAt: `desc` },
      take: limit,
    });
  }

  async findDistinctDeviceIdsByConsumerId(consumerId: string): Promise<string[]> {
    const rows = await this.prisma.consumerActionLogModel.findMany({
      where: { consumerId },
      select: { deviceId: true },
      distinct: [`deviceId`],
    });

    return rows.map((row) => row.deviceId);
  }

  findTimelineByDeviceIds(deviceIds: string[], limit: number) {
    return this.prisma.consumerActionLogModel.findMany({
      where: { deviceId: { in: deviceIds } },
      orderBy: { createdAt: `desc` },
      take: limit,
    });
  }
}
