export const DocumentType = {
  INVOICE: `invoice`,
  CONTRACT: `contract`,
  ATTESTATION: `attestation`,
  OTHER: `other`,
} as const;
export const DocumentTypes = Object.values(DocumentType);
export type IDocumentType = (typeof DocumentType)[keyof typeof DocumentType];

export type IDocumentListItem = {
  id: string;
  name: string;
  type: IDocumentType;
  size: string;
  updated: string;
  fileUrl?: string;
};

export type IUploadDocument = {
  contractId: string;
  name: string;
  type: IDocumentType;
  fileUrl?: string;
  sizeBytes?: number;
};
