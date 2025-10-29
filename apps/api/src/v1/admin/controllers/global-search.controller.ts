import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { UserRole } from '../../../common';
import { Roles } from '../../auth/roles.decorator';
import { SearchResult } from '../dto';
import { GlobalSearchService } from '../services/global-search.service';

@ApiTags(`admin`)
@Controller({ path: `admin/global-search`, version: `1` })
export class GlobalSearchController {
  constructor(private readonly service: GlobalSearchService) {}

  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Get()
  @ApiOkResponse({ type: SearchResult, isArray: true })
  search(@Query(`search`) incoming: string) {
    const search = incoming?.trim();
    if (!search) return { results: [] };
    return this.service.search(search);
  }
}
