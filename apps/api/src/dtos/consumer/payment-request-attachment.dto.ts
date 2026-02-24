/* eslint-disable prettier/prettier */
import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

import { type PaymentRequestAttachmentModel, $Enums } from '@remoola/database-2';

import {
  type IPaymentRequestAttachmentCreate,
  type IPaymentRequestAttachmentResponse,
  type IPaymentRequestAttachmentUpdate,
  type IResourceResponse,
} from '../../shared-common';
import { BaseModel } from '../common';

class PaymentRequestAttachmentDTO extends BaseModel implements PaymentRequestAttachmentModel {
  @Expose()
  @ApiProperty({ description: `ID of the user who requested the attachment` })
  requesterId: string;

  @Expose()
  @ApiProperty({ description: `ID of the payment request this attachment belongs to` })
  paymentRequestId: string;

  @Expose()
  @ApiProperty({ description: `ID of the resource (file) attached to the payment request` })
  resourceId: string;
}

type RequiredResourceFields = Required<Pick<IResourceResponse, `downloadUrl` | `originalName`>>;
type OptionalResourceFields = Partial<Omit<IResourceResponse, `downloadUrl` | `originalName`>>;
type AttachmentFields = OptionalResourceFields & RequiredResourceFields;

export class PaymentRequestAttachmentResponse
  extends OmitType(PaymentRequestAttachmentDTO, [`deletedAt`] as const)
  implements IPaymentRequestAttachmentResponse, AttachmentFields {
  @Expose()
  @ApiProperty({ description: `Resource access level (PUBLIC, PRIVATE, AUTHENTICATED)` })
  access?: $Enums.ResourceAccess;

  @Expose()
  @ApiProperty({ description: `MIME type of the attached file (e.g., "application/pdf", "image/png")` })
  mimetype?: string;

  @Expose()
  @ApiProperty({ description: `File size in bytes` })
  size?: number;

  @Expose()
  @ApiProperty({ description: `Storage bucket name where the file is stored` })
  bucket?: string;

  @Expose()
  @ApiProperty({ description: `Storage key (path) for the file in the bucket` })
  key?: string;

  @Expose()
  @ApiProperty({ description: `Original filename as uploaded by the user` })
  originalName: string;

  @Expose()
  @ApiProperty({ description: `Pre-signed download URL for accessing the file` })
  downloadUrl: string;
}

export class PaymentRequestAttachmentListResponse {
  @Expose()
  @ApiProperty({ description: `Total number of attachments in the result set`, required: true })
  count: number;

  @Expose()
  @ApiProperty({
    description: `Array of payment request attachment records`, required: true, type: [PaymentRequestAttachmentResponse]
  })
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
