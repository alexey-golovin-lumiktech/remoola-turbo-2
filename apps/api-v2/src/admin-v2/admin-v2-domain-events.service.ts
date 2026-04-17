import { Injectable, Logger } from '@nestjs/common';

export type AdminV2DomainEventType = `exchange.executed` | `exchange.failed`;

export type AdminV2DomainEvent = {
  eventType: AdminV2DomainEventType;
  timestamp: string;
  actorId: string;
  resourceType: `exchange_rule` | `scheduled_fx_conversion`;
  resourceId: string;
  producerVersion: number;
  metadata: Record<string, unknown>;
};

type AdminV2DomainEventHandler = (event: AdminV2DomainEvent) => void | Promise<void>;

@Injectable()
export class AdminV2DomainEventsService {
  private readonly logger = new Logger(AdminV2DomainEventsService.name);
  private readonly handlers = new Map<AdminV2DomainEventType, Set<AdminV2DomainEventHandler>>();

  subscribe(eventType: AdminV2DomainEventType, handler: AdminV2DomainEventHandler) {
    const handlers = this.handlers.get(eventType) ?? new Set<AdminV2DomainEventHandler>();
    handlers.add(handler);
    this.handlers.set(eventType, handlers);

    return () => {
      const currentHandlers = this.handlers.get(eventType);
      if (!currentHandlers) {
        return;
      }
      currentHandlers.delete(handler);
      if (currentHandlers.size === 0) {
        this.handlers.delete(eventType);
      }
    };
  }

  async publishAfterCommit(event: AdminV2DomainEvent) {
    this.logger.log({
      event: `admin_v2_domain_event_published`,
      eventType: event.eventType,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      producerVersion: event.producerVersion,
    });

    const handlers = [...(this.handlers.get(event.eventType) ?? [])];
    await Promise.all(
      handlers.map(async (handler) => {
        try {
          await handler(event);
        } catch (error) {
          this.logger.error(
            {
              event: `admin_v2_domain_event_handler_failed`,
              eventType: event.eventType,
              resourceType: event.resourceType,
              resourceId: event.resourceId,
              producerVersion: event.producerVersion,
              message: error instanceof Error ? error.message : String(error),
            },
            error instanceof Error ? error.stack : undefined,
          );
        }
      }),
    );
  }
}
