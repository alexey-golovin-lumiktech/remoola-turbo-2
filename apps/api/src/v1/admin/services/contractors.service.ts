import { Body, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';

import { ContractorEntity } from '../../contractors/contractor.entity';

@Injectable()
export class ContractorsService {
  constructor(@InjectRepository(ContractorEntity) private repository: Repository<ContractorEntity>) {}

  search(search?: string) {
    return this.repository.find({
      where: search ? { name: ILike(`%${search}%`) } : {},
      order: { createdAt: `DESC` },
    });
  }

  create(body: { name: string; email?: string; phone?: string }) {
    return this.repository.save(this.repository.create(body));
  }

  patch(contractorId: string, @Body() body: Partial<ContractorEntity>) {
    return this.repository.update({ id: contractorId }, body);
  }

  delete(contractorId: string) {
    return this.repository.delete({ id: contractorId });
  }
}
