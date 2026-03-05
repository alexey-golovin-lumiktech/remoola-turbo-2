import { z } from 'zod';

export const docParamsSchema = z.object({
  docId: z.string().min(1),
});

export function parseDocParams(params: unknown): { docId: string } | { error: string } {
  const parsed = docParamsSchema.safeParse(params);
  if (!parsed.success) return { error: `Invalid docId` };
  return { docId: parsed.data.docId };
}

export const uploadDocumentSchema = z.object({
  files: z.array(z.instanceof(File)).min(1, `At least one file required`).max(10, `Maximum 10 files allowed`),
  kind: z.enum([`Payment`, `Compliance`, `Contract`, `General`]).optional(),
});

export const bulkDeleteSchema = z.object({
  documentIds: z
    .array(z.string().min(1))
    .min(1, `At least one document required`)
    .max(50, `Maximum 50 documents allowed`),
});

export const attachToPaymentSchema = z.object({
  documentId: z.string().min(1, `Document ID required`),
  paymentRequestId: z.string().min(1, `Payment request ID required`),
});

export const updateTagsSchema = z.object({
  tags: z.array(z.string().min(1).max(50)).max(10, `Maximum 10 tags allowed`),
});

export const documentKindSchema = z.enum([`Payment`, `Compliance`, `Contract`, `General`, `All`]);

export type DocumentKind = z.infer<typeof documentKindSchema>;
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type BulkDeleteInput = z.infer<typeof bulkDeleteSchema>;
export type AttachToPaymentInput = z.infer<typeof attachToPaymentSchema>;
export type UpdateTagsInput = z.infer<typeof updateTagsSchema>;
