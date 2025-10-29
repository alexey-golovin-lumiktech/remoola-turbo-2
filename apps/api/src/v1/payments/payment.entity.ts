import { Column, Entity, Index, ManyToOne } from 'typeorm';

import { PaymentStatuses, PaymentStatus, type IPaymentStatus } from '../../common';
import { BaseAuditColumns } from '../../core/base-audit-columns';
import { ContractEntity } from '../contracts/contract.entity';

@Entity(`payment`)
export class PaymentEntity extends BaseAuditColumns {
  @ManyToOne(() => ContractEntity, (e) => e.payments, { onDelete: `CASCADE`, eager: true })
  contract!: ContractEntity;

  @Column({ type: `int` })
  amountCents!: number;

  @Column({ length: 3, default: `USD` })
  currency!: string;

  @Column({ default: `ACH` })
  method!: string;

  @Index()
  @Column({ type: `enum`, enum: PaymentStatuses, default: PaymentStatus.PENDING })
  status!: IPaymentStatus;

  @Column({ type: `timestamptz`, nullable: true })
  paidAt?: Date;
}
