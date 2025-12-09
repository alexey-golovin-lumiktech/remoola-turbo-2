/* eslint-disable prettier/prettier */
import { ApiProperty, OmitType, PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsDate, IsEmail, IsIn, IsNumber, IsString, IsUUID, ValidateIf } from 'class-validator';

import { $Enums } from '@remoola/database-2';

import { BaseModel } from '../common';
import { PaymentRequestAttachmentResponse } from './payment-request-attachment.dto';
import {
  type IConsumerModel,
  type IPaymentRequestModel,
  type IPaymentRequestResponseExtended,
  type ReqQueryFilter,
  type SortDirectionValue,
  constants,
} from '../../shared-common';

class PaymentRequestDTO extends BaseModel implements IPaymentRequestModel {
  @Expose()
  @ApiProperty()
  @IsUUID(`all`)
  requesterId: string;

  @Expose()
  @ApiProperty()
  @IsUUID(`all`)
  payerId: string;

  @Expose()
  @ApiProperty()
  @IsNumber()
  amount: number;

  @Expose()
  @ApiProperty({ enum: Object.values($Enums.CurrencyCode) })
  @IsString()
  @IsIn(Object.values($Enums.CurrencyCode))
  currencyCode: $Enums.CurrencyCode;

  @Expose()
  @ApiProperty()
  @IsString()
  description: string;

  @Expose()
  @ApiProperty({ enum: Object.values($Enums.TransactionType) })
  @IsString()
  @IsIn(Object.values($Enums.TransactionType))
  type: $Enums.TransactionType;

  @Expose()
  @ApiProperty()
  @ApiProperty({ enum: Object.values($Enums.TransactionStatus) })
  @IsString()
  @IsIn(Object.values($Enums.TransactionStatus))
  status: $Enums.TransactionStatus;

  @Expose()
  @ApiProperty()
  @IsDate()
  dueDate: Date;

  @Expose()
  @ApiProperty()
  @IsDate()
  sentDate: Date;

  @Expose()
  @ApiProperty()
  @IsDate()
  expectationDate: Date;

  @Expose()
  @ApiProperty()
  @IsString()
  createdBy: string;

  @Expose()
  @ApiProperty()
  @IsString()
  updatedBy: string;

  @Expose()
  @ApiProperty({ required: false })
  @ValidateIf((x) => x.value != null)
  @IsString()
  deletedBy?: string;
}

export class PaymentRequestResponse
  extends OmitType(PaymentRequestDTO, [`deletedAt`] as const)
  implements IPaymentRequestResponseExtended {
  @Expose()
  @ApiProperty()
  payerName: string;

  @Expose()
  @ApiProperty()
  payerEmail: string;

  @Expose()
  @ApiProperty()
  requesterName: string;

  @Expose()
  @ApiProperty()
  requesterEmail: string;

  @Expose()
  @ApiProperty({ required: false, type: [PaymentRequestAttachmentResponse] })
  @Type(() => PaymentRequestAttachmentResponse)
  attachments: PaymentRequestAttachmentResponse[] = [];
}

export class PaymentRequestListResponse {
  @Expose()
  @ApiProperty({ required: true })
  count: number;

  @Expose()
  @ApiProperty({ required: true, type: [PaymentRequestResponse] })
  @Type(() => PaymentRequestResponse)
  data: PaymentRequestResponse[];
}

export class PaymentRequestsListQuery {
  paging: { limit: number; offset: number };
  sorting: [{ field: string; direction: SortDirectionValue }];
  filter: ReqQueryFilter<IConsumerModel>;
}

export class PaymentRequestPayToContact extends PickType(PaymentRequestDTO, [
  `description`,
  `amount`,
  `currencyCode`,
  `type`,
] as const) {
  @Expose()
  @ApiProperty()
  @IsEmail({}, { message: constants.INVALID_EMAIL })
  contactEmail: string;
}
