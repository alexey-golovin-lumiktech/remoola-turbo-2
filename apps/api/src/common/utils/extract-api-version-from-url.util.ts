import { type Request } from 'express';

export const extractApiVersionFromUrl = (req: Request) => {
  const match = req.originalUrl?.match(/\/v(\d+)(?:\/|$)/);
  if (!match?.length) return null;
  const version = match[1];
  return version ? `v` + version : null;
};
