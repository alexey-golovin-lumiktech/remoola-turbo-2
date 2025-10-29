import { Entity, Column } from 'typeorm';

import { BaseAuditColumns } from '../../core/base-audit-columns';

@Entity(`user`)
export class UserEntityV2 extends BaseAuditColumns {
  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ default: true })
  isActive: boolean;
}
