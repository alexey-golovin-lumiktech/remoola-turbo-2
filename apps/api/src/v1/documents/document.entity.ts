import { Column, Entity, Index, ManyToOne } from 'typeorm';

import { DocumentType, DocumentTypes, type IDocumentType } from '../../common';
import { BaseAuditColumns } from '../../core/base-audit-columns';
import { ContractEntity } from '../contracts/contract.entity';

@Entity(`document`)
export class DocumentEntity extends BaseAuditColumns {
  @ManyToOne(() => ContractEntity, (e) => e.documents, { onDelete: `CASCADE`, eager: true })
  contract!: ContractEntity;

  @Column()
  name!: string;

  @Index()
  @Column({ type: `enum`, enum: DocumentTypes, default: DocumentType.OTHER })
  type!: IDocumentType;

  @Column({ nullable: true })
  fileUrl?: string;

  @Column({ type: `int`, nullable: true })
  sizeBytes?: number;
}
