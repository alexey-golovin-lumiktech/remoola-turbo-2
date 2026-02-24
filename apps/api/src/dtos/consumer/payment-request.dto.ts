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
  @ApiProperty({ description: `ID of the consumer who created the payment request` })
  @IsUUID(`all`)
  requesterId: string;

  @Expose()
  @ApiProperty({
    description: `ID of the payer (consumer being billed), null if payer is external`,
    required: false,
    nullable: true,
  })
  @ValidateIf((x) => x.value != null)
  @IsUUID(`all`)
  payerId: string | null;

  @Expose()
  @ApiProperty({ description: `Email of external payer (used when payerId is null)`, required: false, nullable: true })
  @ValidateIf((x) => x.value != null)
  @IsString()
  payerEmail?: string | null;

  @Expose()
  @ApiProperty({ description: `Payment amount in the specified currency (major units, e.g., dollars not cents)` })
  @IsNumber()
  amount: number;

  @Expose()
  @ApiProperty({ description: `Currency code (ISO 4217)`, enum: Object.values($Enums.CurrencyCode) })
  @IsString()
  @IsIn(Object.values($Enums.CurrencyCode))
  currencyCode: $Enums.CurrencyCode;

  @Expose()
  @ApiProperty({ description: `Payment description or purpose` })
  @IsString()
  description: string;

  @Expose()
  @ApiProperty({
    description: `Transaction type (e.g., PAYMENT, REFUND, CHARGEBACK)`,
    enum: Object.values($Enums.TransactionType),
  })
  @IsString()
  @IsIn(Object.values($Enums.TransactionType))
  type: $Enums.TransactionType;

  @Expose()
  @ApiProperty({
    description: `Payment request status (PENDING, PAID, CANCELLED, EXPIRED)`,
    enum: Object.values($Enums.TransactionStatus),
  })
  @IsString()
  @IsIn(Object.values($Enums.TransactionStatus))
  status: $Enums.TransactionStatus;

  @Expose()
  @ApiProperty({ description: `Due date for payment (ISO 8601 date)` })
  @IsDate()
  dueDate: Date;

  @Expose()
  @ApiProperty({ description: `Date when the payment request was sent to the payer (ISO 8601 date)` })
  @IsDate()
  sentDate: Date;

  @Expose()
  @ApiProperty({ description: `ID of the user who created the payment request` })
  @IsString()
  createdBy: string;

  @Expose()
  @ApiProperty({ description: `ID of the user who last updated the payment request` })
  @IsString()
  updatedBy: string;

  @Expose()
  @ApiProperty({ description: `ID of the user who soft-deleted the request (null if not deleted)`, required: false })
  @ValidateIf((x) => x.value != null)
  @IsString()
  deletedBy?: string;
}

export class PaymentRequestResponse
  extends OmitType(PaymentRequestDTO, [`deletedAt`] as const)
  implements IPaymentRequestResponseExtended
{
  @Expose()
  @ApiProperty({ description: `Full name of the payer` })
  payerName: string;

  @Expose()
  @ApiProperty({ description: `Email address of the payer` })
  payerEmail: string;

  @Expose()
  @ApiProperty({ description: `Full name of the requester` })
  requesterName: string;

  @Expose()
  @ApiProperty({ description: `Email address of the requester` })
  requesterEmail: string;

  @Expose()
  @ApiProperty({
    description: `List of attachments (invoices, receipts) associated with the payment request`,
    required: false,
    type: [PaymentRequestAttachmentResponse],
  })
  @Type(() => PaymentRequestAttachmentResponse)
  attachments: PaymentRequestAttachmentResponse[] = [];
}

export class PaymentRequestListResponse {
  @Expose()
  @ApiProperty({ description: `Total number of payment requests in the result set`, required: true })
  count: number;

  @Expose()
  @ApiProperty({ description: `Array of payment request records`, required: true, type: [PaymentRequestResponse] })
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
  @ApiProperty({ description: `Email address of the contact to pay` })
  @IsEmail({}, { message: constants.INVALID_EMAIL })
  contactEmail: string;
}
