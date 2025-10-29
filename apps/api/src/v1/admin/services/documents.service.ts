import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';

import { DocumentEntity } from '../../documents/document.entity';

@Injectable()
export class DocumentsService {
  constructor(@InjectRepository(DocumentEntity) private repository: Repository<DocumentEntity>) {}

  search(search?: string) {
    return this.repository.find({
      where: search ? { name: ILike(`%${search}%`) } : {},
      order: { updatedAt: `DESC` },
    });
  }

  delete(documentId: string) {
    return this.repository.delete({ id: documentId });
  }
}
