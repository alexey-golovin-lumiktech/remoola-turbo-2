export const CONSUMER_SESSION_REVOCATION_PORT = Symbol(`CONSUMER_SESSION_REVOCATION_PORT`);

export type ConsumerSessionRevocationPort = {
  revokeAllSessionsByConsumerIdAndAudit(consumerId: string): Promise<unknown>;
};
