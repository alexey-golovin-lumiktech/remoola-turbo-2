import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

class ConsumerContractAddress {
  @Expose()
  @ApiProperty({ example: `221B Baker Street`, nullable: true })
  street?: string | null;

  @Expose()
  @ApiProperty({ example: `London`, nullable: true })
  city?: string | null;

  @Expose()
  @ApiProperty({ example: `Greater London`, nullable: true })
  state?: string | null;

  @Expose()
  @ApiProperty({ example: `NW1 6XE`, nullable: true })
  postalCode?: string | null;

  @Expose()
  @ApiProperty({ example: `United Kingdom`, nullable: true })
  country?: string | null;
}

export class ConsumerContractSummary {
  @Expose()
  @ApiProperty({ example: `completed`, nullable: true })
  lastStatus: string | null;

  @Expose()
  @ApiProperty({ example: `2026-03-31T09:15:00.000Z`, nullable: true })
  lastActivity: Date | null;

  @Expose()
  @ApiProperty({ example: `payment-request-1`, nullable: true })
  lastRequestId: string | null;

  @Expose()
  @ApiProperty({ example: 4 })
  documentsCount: number;

  @Expose()
  @ApiProperty({ example: 7 })
  paymentsCount: number;

  @Expose()
  @ApiProperty({ example: 3 })
  completedPaymentsCount: number;

  @Expose()
  @ApiProperty({ example: 1 })
  draftPaymentsCount: number;

  @Expose()
  @ApiProperty({ example: 2 })
  pendingPaymentsCount: number;

  @Expose()
  @ApiProperty({ example: 1 })
  waitingPaymentsCount: number;
}

export class ConsumerContractPaymentItem {
  @Expose()
  @ApiProperty({ example: `payment-request-1` })
  id: string;

  @Expose()
  @ApiProperty({ example: `2500` })
  amount: string;

  @Expose()
  @ApiProperty({ example: `completed` })
  status: string;

  @Expose()
  @ApiProperty({ example: `2026-03-30T09:15:00.000Z` })
  createdAt: Date;

  @Expose()
  @ApiProperty({ example: `2026-03-31T10:15:00.000Z` })
  updatedAt: Date;

  @Expose()
  @ApiProperty({ example: `REQUESTER` })
  role: string;

  @Expose()
  @ApiProperty({ example: `CARD`, nullable: true })
  paymentRail: string | null;
}

export class ConsumerContractDocumentItem {
  @Expose()
  @ApiProperty({ example: `resource-1` })
  id: string;

  @Expose()
  @ApiProperty({ example: `contract.pdf` })
  name: string;

  @Expose()
  @ApiProperty({ example: `/api/documents/resource-1/download` })
  downloadUrl: string;

  @Expose()
  @ApiProperty({ example: `2026-03-30T08:15:00.000Z` })
  createdAt: Date;

  @Expose()
  @ApiProperty({ type: [String], example: [`invoice`, `vendor`] })
  tags: string[];

  @Expose()
  @ApiProperty({ example: false })
  isAttachedToDraftPaymentRequest: boolean;

  @Expose()
  @ApiProperty({ type: [String], example: [`payment-draft-1`] })
  attachedDraftPaymentRequestIds: string[];

  @Expose()
  @ApiProperty({ example: true })
  isAttachedToNonDraftPaymentRequest: boolean;

  @Expose()
  @ApiProperty({ type: [String], example: [`payment-1`] })
  attachedNonDraftPaymentRequestIds: string[];
}

export class ConsumerContractDetails {
  @Expose()
  @ApiProperty({ example: `35f4d4b2-0bb8-4c74-95b4-e5b8f186e284` })
  id: string;

  @Expose()
  @ApiProperty({ example: `Vendor LLC`, nullable: true })
  name: string | null;

  @Expose()
  @ApiProperty({ example: `vendor@example.com` })
  email: string;

  @Expose()
  @ApiProperty({ example: `2026-03-29T08:15:00.000Z` })
  updatedAt: Date;

  @Expose()
  @Type(() => ConsumerContractAddress)
  @ApiProperty({ type: ConsumerContractAddress, nullable: true })
  address: ConsumerContractAddress | null;

  @Expose()
  @Type(() => ConsumerContractSummary)
  @ApiProperty({ type: ConsumerContractSummary })
  summary: ConsumerContractSummary;

  @Expose()
  @Type(() => ConsumerContractPaymentItem)
  @ApiProperty({ type: [ConsumerContractPaymentItem] })
  payments: ConsumerContractPaymentItem[];

  @Expose()
  @Type(() => ConsumerContractDocumentItem)
  @ApiProperty({ type: [ConsumerContractDocumentItem] })
  documents: ConsumerContractDocumentItem[];
}
