import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PaymentEntity } from '../../payments/payment.entity';

@Injectable()
export class PaymentsService {
  constructor(@InjectRepository(PaymentEntity) private repository: Repository<PaymentEntity>) {}

  list() {
    return this.repository.find({ order: { createdAt: `DESC` } });
  }

  delete(paymentId: string) {
    return this.repository.delete({ id: paymentId });
  }
}
