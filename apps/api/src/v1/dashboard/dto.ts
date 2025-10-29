import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

import { IDashboard } from '../../common';
import { ContractListItem } from '../contracts/dto';
import { DocumentListItem } from '../documents/dto';

export class Compliance {
  @Expose()
  @ApiProperty()
  w9Ready: boolean;

  @Expose()
  @ApiProperty()
  kycInReview: boolean;

  @Expose()
  @ApiProperty()
  bankVerified: boolean;
}

export class Dashboard implements IDashboard {
  @Expose()
  @ApiProperty()
  balance: string;

  @Expose()
  @ApiProperty()
  contractsActiveCount: number;

  @Expose()
  @ApiProperty()
  lastPaymentAgo: string;

  @Expose()
  @ApiProperty({ type: ContractListItem, isArray: true })
  openContracts: ContractListItem[];

  @Expose()
  @ApiProperty({ type: DocumentListItem, isArray: true })
  quickDocs: DocumentListItem[];

  @Expose()
  @ApiProperty({ type: Compliance, isArray: false })
  compliance: Compliance;
}
