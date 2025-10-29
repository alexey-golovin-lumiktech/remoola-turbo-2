import { Column, Entity, OneToMany } from 'typeorm';

import { BaseAuditColumns } from '../../core/base-audit-columns';
import { ContractEntity } from '../contracts/contract.entity';

@Entity(`contractor`)
export class ContractorEntity extends BaseAuditColumns {
  @Column()
  name!: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone?: string;

  @OneToMany(() => ContractEntity, (e) => e.contractor)
  contracts!: ContractEntity[];
}
