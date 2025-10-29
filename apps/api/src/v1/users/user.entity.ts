import { Entity, Column, OneToMany } from 'typeorm';

import { UserRoles, UserRole, type IUserRole } from '../../common';
import { BaseAuditColumns } from '../../core/base-audit-columns';
import { ContractEntity } from '../contracts/contract.entity';

@Entity(`user`)
export class UserEntity extends BaseAuditColumns {
  @Column({ unique: true })
  email!: string;

  @Column()
  name!: string;

  @Column({ type: `enum`, enum: UserRoles, default: UserRole.CLIENT })
  role!: IUserRole;

  @Column({ select: false })
  passwordHash!: string;

  @OneToMany(() => ContractEntity, (e) => e.client)
  contracts!: ContractEntity[];
}
