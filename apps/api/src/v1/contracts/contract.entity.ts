import { Column, Entity, Index, ManyToOne, OneToMany } from 'typeorm';

import { RateUnit, type IRateUnit, ContractStatuses, ContractStatus, type IContractStatus } from '../../common';
import { BaseAuditColumns } from '../../core/base-audit-columns';
import { ContractorEntity } from '../contractors/contractor.entity';
import { DocumentEntity } from '../documents/document.entity';
import { PaymentEntity } from '../payments/payment.entity';
import { UserEntity } from '../users/user.entity';

@Entity(`contract`)
export class ContractEntity extends BaseAuditColumns {
  @ManyToOne(() => UserEntity, (e) => e.contracts, { eager: true })
  client!: UserEntity;

  @ManyToOne(() => ContractorEntity, (e) => e.contracts, { eager: true })
  contractor!: ContractorEntity;

  @Column({ type: `int` })
  rateCents!: number;

  @Column({ type: `enum`, enum: RateUnit, default: RateUnit.HOURLY })
  rateUnit!: IRateUnit;

  @Index()
  @Column({ type: `enum`, enum: ContractStatuses, default: ContractStatus.DRAFT })
  status!: IContractStatus;

  @OneToMany(() => PaymentEntity, (e) => e.contract)
  payments!: PaymentEntity[];

  @OneToMany(() => DocumentEntity, (e) => e.contract)
  documents!: DocumentEntity[];

  @Column({ type: `timestamptz`, nullable: true })
  lastActivityAt?: Date;
}
