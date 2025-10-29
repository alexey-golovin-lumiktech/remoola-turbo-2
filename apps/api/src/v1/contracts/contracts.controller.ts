import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { type Request } from 'express';

import { ContractsService } from './contracts.service';
import { CreateContract, UpdateContract } from './dto';
import { JwtAuthGuard } from '../auth/jwt.guard';

@ApiBearerAuth(`jwt`)
@UseGuards(JwtAuthGuard)
@Controller({ path: `consumer/contracts`, version: `1` })
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get()
  list(@Req() req: Request & { user: any }, @Query(`clientId`) clientId?: string, @Query(`search`) search?: string) {
    const sub = req.user?.[`sub`] || clientId;
    return this.contractsService.list(sub, search);
  }

  @Post()
  create(@Req() req: Request, @Body() body: CreateContract) {
    const clientId = (req as any).user.sub;
    return this.contractsService.create({ ...body, clientId });
  }

  @Put(`:id`)
  update(@Param(`id`) id: string, @Body() body: UpdateContract) {
    return this.contractsService.update(id, body);
  }
}
