export function detectConsumerDocumentKind(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.includes(`w9`) || lower.includes(`w-9`)) return `COMPLIANCE`;
  if (lower.includes(`contract`)) return `CONTRACT`;
  if (lower.includes(`invoice`)) return `PAYMENT`;
  return `GENERAL`;
}
