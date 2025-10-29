import { Controller, Delete, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { UserRole } from '../../../common';
import { Roles } from '../../auth/roles.decorator';
import { DocumentsService } from '../services/documents.service';

@ApiTags(`admin`)
@Controller({ path: `admin/documents`, version: `1` })
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Get()
  search(@Query(`search`) search?: string) {
    return this.service.search(search);
  }

  @Roles(UserRole.SUPERADMIN)
  @Delete(`:documentId`)
  delete(@Param(`documentId`) documentId: string) {
    return this.service.delete(documentId);
  }
}
