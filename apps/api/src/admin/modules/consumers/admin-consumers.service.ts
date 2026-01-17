import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class AdminConsumersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllConsumers() {
    return this.prisma.consumerModel.findMany({
      orderBy: { createdAt: `desc` },
    });
  }

  async getById(id: string) {
    return this.prisma.consumerModel.findUnique({
      where: { id },
      include: {
        personalDetails: true,
        organizationDetails: true,
        addressDetails: true,
        googleProfileDetails: true,
      },
    });
  }
}
