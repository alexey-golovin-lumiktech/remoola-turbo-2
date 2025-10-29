import { type Provider } from '@nestjs/common';

import { DocumentsService } from './documents.service';

export const providers = [DocumentsService] satisfies Provider[];
