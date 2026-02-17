export type ApiErrorShape = {
  message: string;
  code?: string;
  details?: unknown;
};

export type ApiResponseShape<T> = { ok: true; data: T } | { ok: false; status: number; error: ApiErrorShape };
