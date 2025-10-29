import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';

import { BaseAuditColumns } from '../../core/base-audit-columns';
import { UserEntity } from '../users/user.entity';

@Entity(`compliance_checklist`)
export class ComplianceChecklistEntity extends BaseAuditColumns {
  @OneToOne(() => UserEntity, { onDelete: `CASCADE`, eager: true })
  @JoinColumn()
  user!: UserEntity;

  @Column({ default: false })
  w9Ready!: boolean;

  @Column({ default: false })
  kycInReview!: boolean;

  @Column({ default: false })
  bankVerified!: boolean;
}
