import { Injectable, Logger } from '@nestjs/common';

type AdminV2DomainEventType = `exchange.executed` | `exchange.failed`;

export type AdminV2DomainEvent = {
  eventType: AdminV2DomainEventType;
  timestamp: string;
  actorId: string;
  resourceType: `exchange_rule` | `scheduled_fx_conversion`;
  resourceId: string;
  producerVersion: number;
  metadata: Record<string, unknown>;
};

@Injectable()
export class AdminV2DomainEventsService {
  private readonly logger = new Logger(AdminV2DomainEventsService.name);

  async publishAfterCommit(event: AdminV2DomainEvent) {
    this.logger.log({
      event: `admin_v2_domain_event_published`,
      eventType: event.eventType,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      producerVersion: event.producerVersion,
    });
  }
}
