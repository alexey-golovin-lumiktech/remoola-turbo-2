import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';

import { StartPayment, UpdatePaymentStatus } from './dto';
import { PaymentEntity } from './payment.entity';
import { fmt, PaymentStatus } from '../../common';
import { ContractEntity } from '../contracts/contract.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentEntity) private readonly paymentRepository: Repository<PaymentEntity>,
    @InjectRepository(ContractEntity) private readonly contractRepository: Repository<ContractEntity>,
    @InjectQueue(`payments`) private readonly paymentsQueue: Queue,
  ) {}

  async listByClient(clientId: string) {
    const rows = await this.paymentRepository.find({
      where: { contract: { client: { id: clientId } } },
      order: { createdAt: `DESC` },
    });

    return rows.map((p) => ({
      id: p.id,
      contract: p.contract.contractor?.name || `Unknown contractor`,
      amount: fmt(p.amountCents),
      method: p.method,
      status:
        p.status == PaymentStatus.COMPLETED ? `Completed` : p.status == PaymentStatus.PENDING ? `Pending` : `Failed`,
      date: p.paidAt ? p.paidAt.toLocaleDateString(undefined, { month: `short`, day: `numeric` }) : ``,
    }));
  }

  async start(body: StartPayment) {
    const contract = await this.contractRepository.findOneByOrFail({ id: body.contractId });
    const entity = await this.paymentRepository.save(
      this.paymentRepository.create({
        contract,
        amountCents: body.amountCents,
        currency: body.currency ?? `USD`,
        method: body.method ?? `ACH`,
        status: PaymentStatus.PENDING,
      }),
    );
    await this.paymentsQueue.add(
      `process`,
      { paymentId: entity.id },
      {
        jobId: `payment:${entity.id}`,
        attempts: 5,
        backoff: { type: `exponential`, delay: 2000 },
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );
    return entity;
  }

  async markCompleted(id: string, dto?: UpdatePaymentStatus) {
    await this.paymentRepository.update({ id }, { ...dto, status: PaymentStatus.COMPLETED, paidAt: new Date() });
    return this.paymentRepository.findOneByOrFail({ id });
  }

  async markFailed(id: string) {
    await this.paymentRepository.update({ id }, { status: PaymentStatus.FAILED });
    return this.paymentRepository.findOneByOrFail({ id });
  }
}
