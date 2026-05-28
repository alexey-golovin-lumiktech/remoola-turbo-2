type ResponseSchema<T> = {
  parse(data: unknown): T;
};

export function toAdminV2WireContract<T>(schema: ResponseSchema<T>, value: unknown): T {
  return schema.parse(JSON.parse(JSON.stringify(value)) as unknown);
}
