import { Inject, Injectable } from '@nestjs/common'

import { BaseService } from '../../../common/base.service'
import { IAddressModel, IBaseModel } from '../../../models'

import { AddressesRepository } from './addresses.repository'

type IUpsertAddress = Partial<Omit<IAddressModel, keyof IBaseModel>> & { consumerId: string; billingDetailsId: string }
@Injectable()
export class AddressesService extends BaseService<IAddressModel, AddressesRepository> {
  constructor(@Inject(AddressesRepository) repo: AddressesRepository) {
    super(repo)
  }

  async upsertAddress(dto: IUpsertAddress): Promise<IAddressModel> {
    const [exist] = await this.repository.find({ filter: { consumerId: dto.consumerId } })
    const result = exist == null ? await this.repository.create(dto) : await this.repository.updateById(exist.id, dto)
    return result
  }

  async getAddress(filter: { consumerId: string; billingDetailsId: string }) {
    const [result] = await this.repository.find({ filter })
    return result ?? null
  }
}
