import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

import { IPaymentRequestAttachmentModel, ResourceAccess } from '@remoola/database';

import {
  IPaymentRequestAttachmentCreate,
  IPaymentRequestAttachmentResponse,
  IPaymentRequestAttachmentUpdate,
  IResourceResponse,
} from '../../shared-common';
import { BaseModel } from '../common';

class PaymentRequestAttachment extends BaseModel implements IPaymentRequestAttachmentModel {
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
  extends OmitType(PaymentRequestAttachment, [`deletedAt`] as const)
  implements IPaymentRequestAttachmentResponse, AttachmentFields {
  @Expose()
  @ApiProperty()
  access?: ResourceAccess;

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
  extends PickType(PaymentRequestAttachment, [
    `requesterId`, //
    `paymentRequestId`,
    `resourceId`,
  ] as const)
  implements IPaymentRequestAttachmentCreate {}

export class PaymentRequestAttachmentUpdate
  extends PartialType(PaymentRequestAttachmentCreate)
  implements IPaymentRequestAttachmentUpdate {}
