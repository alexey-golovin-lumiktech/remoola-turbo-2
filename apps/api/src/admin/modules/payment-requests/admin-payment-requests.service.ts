import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class AdminPaymentRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllPaymentRequests() {
    return this.prisma.paymentRequestModel.findMany({
      orderBy: { createdAt: `desc` },
    });
  }

  async geyById(id: string) {
    return this.prisma.paymentRequestModel.findUnique({ where: { id } });
  }
}
