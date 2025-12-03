import { ApiProperty } from '@nestjs/swagger';

import { ConsumerContractItem } from './consumer-contract-item.dto';

export class ConsumerContractsResponse {
  @ApiProperty({ type: [ConsumerContractItem] })
  items: ConsumerContractItem[];
}
