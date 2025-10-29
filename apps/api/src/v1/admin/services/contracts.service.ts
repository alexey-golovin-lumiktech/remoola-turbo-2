import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ContractEntity } from '../../contracts/contract.entity';

@Injectable()
export class ContractsService {
  constructor(@InjectRepository(ContractEntity) private repository: Repository<ContractEntity>) {}

  list() {
    return this.repository.find({ order: { updatedAt: `DESC` } });
  }

  patch(contractId: string, body: Partial<ContractEntity>) {
    return this.repository.update({ id: contractId }, body);
  }

  delete(contractId: string) {
    return this.repository.delete({ id: contractId });
  }
}
