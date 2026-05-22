export function encodeApiPathSegment(value: string): string {
  return encodeURIComponent(value.trim());
}
