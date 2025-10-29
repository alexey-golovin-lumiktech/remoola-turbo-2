import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';

import { ContractEntity } from './contract.entity';
import { CreateContract, UpdateContract, ContractListItem } from './dto';
import { ago, ContractStatus, errors, money } from '../../common';
import { ContractorEntity } from '../contractors/contractor.entity';
import { UserEntity } from '../users/user.entity';

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(
    @InjectRepository(ContractEntity) private readonly contractRepository: Repository<ContractEntity>,
    @InjectRepository(UserEntity) private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ContractorEntity) private readonly contractorRepository: Repository<ContractorEntity>,
  ) {}

  async list(clientId: string, search?: string) {
    const rows = await this.contractRepository.find({
      where: { client: { id: clientId }, ...(search ? { contractor: { name: ILike(`%${search}%`) } } : {}) },
      order: { updatedAt: `DESC` },
    });

    return rows.map(
      (r) =>
        ({
          id: r.id,
          contractorId: r.contractor?.id,
          contractorName: r.contractor?.name,
          rate: money(r.rateCents, r.rateUnit),
          status: r.status,
          lastActivityAgo: ago(r.lastActivityAt ?? r.updatedAt),
        }) satisfies ContractListItem,
    );
  }

  async create(body: CreateContract) {
    try {
      const client = await this.userRepository.findOneByOrFail({ id: body.clientId });

      const contractor = !body.contractorId
        ? null
        : await this.contractorRepository.findOneByOrFail({ id: body.contractorId });

      const contract = this.contractRepository.create({
        client,
        ...(contractor && { contractor }),
        rateCents: body.rateCents,
        rateUnit: body.rateUnit,
        status: ContractStatus.DRAFT,
      });
      return this.contractRepository.save(contract);
    } catch (error) {
      this.logger.debug(String(error));
      throw new InternalServerErrorException(errors.FAIL_CREATE_CONTRACT);
    }
  }

  async update(id: string, body: UpdateContract) {
    await this.contractRepository.update({ id }, { ...body, lastActivityAt: new Date() });
    return this.contractRepository.findOneByOrFail({ id });
  }
}
