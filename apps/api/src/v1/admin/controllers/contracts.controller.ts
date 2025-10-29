import { Body, Controller, Delete, Get, Param, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { UserRole } from '../../../common';
import { Roles } from '../../auth/roles.decorator';
import { ContractEntity } from '../../contracts/contract.entity';
import { ContractsService } from '../services/contracts.service';

@ApiTags(`admin`)
@Controller({ path: `admin/contracts`, version: `1` })
export class ContractsController {
  constructor(private readonly service: ContractsService) {}

  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Get()
  list() {
    return this.service.list();
  }

  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Patch(`:contractId`)
  patch(@Param(`contractId`) contractId: string, @Body() body: Partial<ContractEntity>) {
    return this.service.patch(contractId, body);
  }

  @Roles(UserRole.SUPERADMIN)
  @Delete(`:contractId`)
  delete(@Param(`contractId`) contractId: string) {
    return this.service.delete(contractId);
  }
}
