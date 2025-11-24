import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

import { type PaymentRequestAttachmentModel, $Enums } from '@remoola/database';

import {
  IPaymentRequestAttachmentCreate,
  IPaymentRequestAttachmentResponse,
  IPaymentRequestAttachmentUpdate,
  IResourceResponse,
} from '../../shared-common';
import { BaseModel } from '../common';

class PaymentRequestAttachmentDTO extends BaseModel implements PaymentRequestAttachmentModel {
  @Expose()
  @ApiProperty()
  requesterId: string;

  @Expose()
  @ApiProperty()
  paymentRequestId: string;

  @Expose()
  @ApiProperty()
  resourceId: string;
}

type RequiredResourceFields = Required<Pick<IResourceResponse, `downloadUrl` | `originalname`>>;
type OptionalResourceFields = Partial<Omit<IResourceResponse, `downloadUrl` | `originalname`>>;
type AttachmentFields = OptionalResourceFields & RequiredResourceFields;

export class PaymentRequestAttachmentResponse
  extends OmitType(PaymentRequestAttachmentDTO, [`deletedAt`] as const)
  implements IPaymentRequestAttachmentResponse, AttachmentFields {
  @Expose()
  @ApiProperty()
  access?: $Enums.ResourceAccess;

  @Expose()
  @ApiProperty()
  mimetype?: string;

  @Expose()
  @ApiProperty()
  size?: number;

  @Expose()
  @ApiProperty()
  bucket?: string;

  @Expose()
  @ApiProperty()
  key?: string;

  @Expose()
  @ApiProperty()
  originalname: string;

  @Expose()
  @ApiProperty()
  downloadUrl: string;
}

export class PaymentRequestAttachmentListResponse {
  @Expose()
  @ApiProperty({ required: true })
  count: number;

  @Expose()
  @ApiProperty({ required: true, type: [PaymentRequestAttachmentResponse] })
  @Type(() => PaymentRequestAttachmentResponse)
  data: PaymentRequestAttachmentResponse[];
}

export class PaymentRequestAttachmentCreate
  extends PickType(PaymentRequestAttachmentDTO, [
    `requesterId`, //
    `paymentRequestId`,
    `resourceId`,
  ] as const)
  implements IPaymentRequestAttachmentCreate {}

export class PaymentRequestAttachmentUpdate
  extends PartialType(PaymentRequestAttachmentCreate)
  implements IPaymentRequestAttachmentUpdate {}
