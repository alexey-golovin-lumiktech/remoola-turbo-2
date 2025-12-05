export class ConsumerDocument {
  id: string;
  name: string;
  size: number;
  createdAt: string;
  downloadUrl: string;
  mimetype: string | null;
  kind: string; // GENERAL | PAYMENT | COMPLIANCE | CONTRACT
  tags: string[];
}

export class BulkDeleteDocuments {
  ids: string[];
}

export class AttachDocuments {
  paymentRequestId: string;
  resourceIds: string[];
}

export class SetTags {
  tags: string[];
}
