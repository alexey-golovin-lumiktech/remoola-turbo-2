type ResponseSchema<T> = {
  parse(data: unknown): T;
};

export function toConsumerWireContract<T>(schema: ResponseSchema<T>, value: unknown): T {
  return schema.parse(JSON.parse(JSON.stringify(value)) as unknown);
}
