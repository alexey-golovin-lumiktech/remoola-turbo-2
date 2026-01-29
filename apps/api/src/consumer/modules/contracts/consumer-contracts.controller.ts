import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { type ConsumerModel } from '@remoola/database-2';

import { ConsumerContractsService } from './consumer-contracts.service';
import { ConsumerContractItem } from './dto';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { Identity } from '../../../common';

@ApiTags(`Consumer: Contracts`)
@Controller(`consumer/contracts`)
@UseGuards(JwtAuthGuard)
export class ConsumerContractsController {
  constructor(private readonly service: ConsumerContractsService) {}

  @Get()
  async list(@Identity() consumer: ConsumerModel): Promise<ConsumerContractItem[]> {
    return this.service.getContracts(consumer.id);
  }
}
