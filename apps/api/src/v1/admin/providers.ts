import { type Provider } from '@nestjs/common';

import { AdminsService } from './services/admins.service';
import { ClientsService } from './services/clients.service';
import { ContractorsService } from './services/contractors.service';
import { ContractsService } from './services/contracts.service';
import { DocumentsService } from './services/documents.service';
import { GlobalSearchService } from './services/global-search.service';
import { PaymentsService } from './services/payments.service';
import { UsersService } from './services/users.service';

export const providers = [
  AdminsService,
  ClientsService,
  ContractorsService,
  ContractsService,
  DocumentsService,
  GlobalSearchService,
  PaymentsService,
  UsersService,
] satisfies Provider[];
