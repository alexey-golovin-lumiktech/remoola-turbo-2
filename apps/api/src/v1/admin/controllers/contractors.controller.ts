import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { UserRole } from '../../../common';
import { Roles } from '../../auth/roles.decorator';
import { ContractorEntity } from '../../contractors/contractor.entity';
import { ContractorsService } from '../services/contractors.service';

@ApiTags(`admin`)
@Controller({ path: `admin/contractors`, version: `1` })
export class ContractorsController {
  constructor(private readonly service: ContractorsService) {}

  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Get()
  search(@Query(`search`) search?: string) {
    return this.service.search(search);
  }

  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Post()
  create(@Body() body: { name: string; email?: string; phone?: string }) {
    return this.service.create(body);
  }

  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Patch(`:contractorId`)
  patch(@Param(`contractorId`) contractorId: string, @Body() body: Partial<ContractorEntity>) {
    return this.service.patch(contractorId, body);
  }

  @Roles(UserRole.SUPERADMIN)
  @Delete(`:contractorId`)
  delete(@Param(`contractorId`) contractorId: string) {
    return this.service.delete(contractorId);
  }
}
