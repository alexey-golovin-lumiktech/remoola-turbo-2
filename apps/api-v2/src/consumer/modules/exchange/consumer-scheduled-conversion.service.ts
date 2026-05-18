import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerCurrencyConversionService } from './consumer-currency-conversion.service';
import { ConsumerExchangeAutomationRepository } from './consumer-exchange-automation.repository';
import { normalizeConsumerScheduledConversion } from './consumer-exchange-normalizers';
import { ScheduleConversionBody } from './dto/schedule-conversion.dto';

@Injectable()
export class ConsumerScheduledConversionService {
  private readonly logger = new Logger(ConsumerScheduledConversionService.name);

  constructor(
    private readonly conversionService: ConsumerCurrencyConversionService,
    private readonly automationRepository: ConsumerExchangeAutomationRepository,
  ) {}

  async listScheduledConversions(
    consumerId: string,
    page = 1,
    pageSize = 10,
  ): Promise<{
    items: ReturnType<typeof normalizeConsumerScheduledConversion>[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const safePage = Math.max(1, Math.floor(Number(page)) || 1);
    const safePageSize = Math.min(100, Math.max(1, Math.floor(Number(pageSize)) || 10));

    const [total, conversions] = await Promise.all([
      this.automationRepository.countScheduledConversions(consumerId),
      this.automationRepository.listScheduledConversions(consumerId, (safePage - 1) * safePageSize, safePageSize),
    ]);

    const items = conversions.map((conversion) => normalizeConsumerScheduledConversion(conversion));
    return { items, total, page: safePage, pageSize: safePageSize };
  }

  async scheduleConversion(consumerId: string, body: ScheduleConversionBody) {
    const { from, to, amount } = body;

    if (from === to) {
      throw new BadRequestException(errorCodes.CURRENCIES_MUST_DIFFER_SCHEDULE);
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException(errorCodes.INVALID_AMOUNT_SCHEDULE);
    }

    const executeAt = new Date(body.executeAt);
    if (Number.isNaN(executeAt.getTime())) {
      throw new BadRequestException(errorCodes.INVALID_EXECUTE_AT);
    }

    if (executeAt.getTime() <= Date.now()) {
      throw new BadRequestException(errorCodes.EXECUTE_AT_MUST_BE_FUTURE);
    }

    const conversion = await this.automationRepository.createScheduledConversion({
      consumerId,
      fromCurrency: from,
      toCurrency: to,
      amount,
      executeAt,
    });
    return normalizeConsumerScheduledConversion(conversion);
  }

  async cancelScheduledConversion(consumerId: string, conversionId: string) {
    const conversion = await this.automationRepository.findActiveScheduledConversion(consumerId, conversionId);

    if (!conversion) {
      throw new NotFoundException(errorCodes.SCHEDULED_CONVERSION_NOT_FOUND_CANCEL);
    }

    if (conversion.status !== $Enums.ScheduledFxConversionStatus.PENDING) {
      throw new BadRequestException(errorCodes.ONLY_PENDING_CONVERSIONS_CAN_CANCEL);
    }

    await this.automationRepository.cancelScheduledConversion(conversion.id, new Date());

    return { conversionId: conversion.id };
  }

  async processDueScheduledConversions() {
    const now = new Date();
    const due = await this.automationRepository.findDueScheduledConversions(now, 25);

    let processedCount = 0;
    let failedCount = 0;

    for (const conversion of due) {
      const claimed = await this.automationRepository.claimDueScheduledConversion(conversion.id);
      if (!claimed) {
        this.logger.debug(`Scheduled conversion already claimed or processed: ${conversion.id}`);
        continue;
      }

      processedCount++;

      try {
        const result = await this.conversionService.convertInternal(
          conversion.consumerId,
          {
            from: conversion.fromCurrency,
            to: conversion.toCurrency,
            amount: Number(conversion.amount),
          },
          {
            metadata: { source: `scheduled`, scheduledConversionId: conversion.id },
            idempotencyKeyPrefix: `scheduled:${conversion.id}`,
          },
        );

        await this.automationRepository.markScheduledConversionExecuted(conversion.id, result.ledgerId);
      } catch (error) {
        failedCount++;
        const message = error instanceof Error ? error.message : `Unknown error`;
        this.logger.warn(`Scheduled conversion failed (${conversion.id}): ${message}`);

        await this.automationRepository.markScheduledConversionFailed(conversion.id, message);
      }
    }

    if (processedCount > 0 || failedCount > 0) {
      this.logger.log(`Scheduled conversions: processed=${processedCount}, failed=${failedCount}`);
    }
  }

  async executeScheduledConversionNow(conversionId: string, initiatedBy?: { source: string; actorId?: string }) {
    const conversion = await this.automationRepository.findScheduledConversionById(conversionId);

    if (!conversion) {
      throw new NotFoundException(errorCodes.SCHEDULED_CONVERSION_NOT_FOUND_EXECUTE);
    }

    if (conversion.status === $Enums.ScheduledFxConversionStatus.EXECUTED) {
      throw new BadRequestException(errorCodes.CONVERSION_ALREADY_EXECUTED);
    }

    if (conversion.status === $Enums.ScheduledFxConversionStatus.CANCELLED) {
      throw new BadRequestException(errorCodes.CONVERSION_CANCELLED);
    }

    const claimed = await this.automationRepository.claimScheduledConversionNow(conversion.id);
    if (!claimed) {
      throw new BadRequestException(errorCodes.CONVERSION_ALREADY_PROCESSING);
    }

    try {
      const result = await this.conversionService.convertInternal(
        conversion.consumerId,
        {
          from: conversion.fromCurrency,
          to: conversion.toCurrency,
          amount: Number(conversion.amount),
        },
        {
          metadata: {
            source: initiatedBy?.source ?? `admin`,
            initiatedBy: initiatedBy?.actorId ?? null,
            scheduledConversionId: conversion.id,
          },
          idempotencyKeyPrefix: `scheduled:${conversion.id}`,
        },
      );

      await this.automationRepository.markScheduledConversionExecuted(conversion.id, result.ledgerId);

      return {
        conversionId: conversion.id,
        ledgerId: result.ledgerId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : `Unknown error`;
      this.logger.warn(`Admin forced conversion failed (${conversion.id}): ${message}`);

      await this.automationRepository.markScheduledConversionFailed(conversion.id, message);

      throw error;
    }
  }
}
