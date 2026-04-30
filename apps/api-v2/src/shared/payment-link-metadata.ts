import { parseConsumerAppScope, type ConsumerAppScope } from '@remoola/api-types';
import { type Prisma } from '@remoola/database-2';

const PAYMENT_LINK_CONSUMER_APP_SCOPE_KEY = `consumerAppScope` as const;

type JsonRecord = Prisma.JsonObject;

function isJsonRecord(value: Prisma.JsonValue | null | undefined): value is JsonRecord {
  return value != null && typeof value === `object` && !Array.isArray(value);
}

export function appendConsumerAppScopeToMetadata(
  metadata: JsonRecord,
  consumerAppScope?: ConsumerAppScope,
): Prisma.InputJsonValue {
  if (!consumerAppScope) {
    return metadata as Prisma.InputJsonValue;
  }

  return {
    ...metadata,
    [PAYMENT_LINK_CONSUMER_APP_SCOPE_KEY]: consumerAppScope,
  } as Prisma.InputJsonValue;
}

export function extractConsumerAppScopeFromMetadata(
  metadata: Prisma.JsonValue | null | undefined,
): ConsumerAppScope | undefined {
  if (!isJsonRecord(metadata)) {
    return undefined;
  }

  const rawScope = metadata[PAYMENT_LINK_CONSUMER_APP_SCOPE_KEY];
  return typeof rawScope === `string` ? parseConsumerAppScope(rawScope) : undefined;
}
