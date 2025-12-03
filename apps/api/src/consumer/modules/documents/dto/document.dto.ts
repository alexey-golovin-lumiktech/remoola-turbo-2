export class ConsumerDocumentDto {
  id: string;
  name: string;
  size: number;
  createdAt: string;
  downloadUrl: string;
  mimetype: string | null;
  kind: string; // GENERAL | PAYMENT | COMPLIANCE | CONTRACT
  tags: string[];
}

export class BulkDeleteDocumentsDto {
  ids: string[];
}

export class AttachDocumentsDto {
  paymentRequestId: string;
  resourceIds: string[];
}

export class SetTagsDto {
  tags: string[];
}
