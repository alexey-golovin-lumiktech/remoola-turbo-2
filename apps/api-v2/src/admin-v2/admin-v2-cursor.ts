export type AdminV2CursorPayload = {
  createdAt: string;
  id: string;
};

export function encodeAdminV2Cursor(payload: { createdAt: Date; id: string }): string {
  return Buffer.from(
    JSON.stringify({
      createdAt: payload.createdAt.toISOString(),
      id: payload.id,
    } satisfies AdminV2CursorPayload),
  ).toString(`base64url`);
}

export function decodeAdminV2Cursor(cursor: string | undefined): { createdAt: Date; id: string } | null {
  if (!cursor?.trim()) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(cursor, `base64url`).toString(`utf8`)) as AdminV2CursorPayload;
    const createdAt = new Date(decoded.createdAt);
    if (!decoded.id || Number.isNaN(createdAt.getTime())) {
      return null;
    }
    return {
      createdAt,
      id: decoded.id,
    };
  } catch {
    return null;
  }
}
