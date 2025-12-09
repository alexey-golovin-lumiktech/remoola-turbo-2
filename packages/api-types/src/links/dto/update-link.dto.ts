import { PartialType } from '@nestjs/mapped-types';

import { CreateLink } from './create-link.dto';

export class UpdateLinkDto extends PartialType(CreateLink) {}
