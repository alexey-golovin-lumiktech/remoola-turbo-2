import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectKnex, Knex } from 'nestjs-knex'

import { BillingDetailsRepository } from '../billing-details/billing-details.repository'
import { GoogleProfilesRepository } from '../google-profiles/google-profiles.repository'

import { BaseRepository } from 'src/common'
import { IConsumerModel, TableName } from 'src/models'
import { IFilter } from 'src/shared-types'

@Injectable()
export class ConsumersRepository extends BaseRepository<IConsumerModel> {
  private readonly logger = new Logger(ConsumersRepository.name)
  private readonly mode: string

  constructor(
    @InjectKnex() knex: Knex,
    @Inject(BillingDetailsRepository) private readonly billingDetailsRepository: BillingDetailsRepository,
    @Inject(GoogleProfilesRepository) private readonly googleProfilesRepository: GoogleProfilesRepository,
    private readonly configService: ConfigService,
  ) {
    super(knex, TableName.Consumers)
    this.mode = this.configService.get<string>(`NODE_ENV`)
  }

  async completelyDelete(filter: IFilter<IConsumerModel>/* eslint-disable-line */): Promise<boolean> {
    if (this.mode == `development`) {
      // const [consumer] = await this.update(filter, { googleProfileId: null })
      // if (!consumer) return true

      // @IMPORTANT NOTE: Coming soon
      // const [deletedAddress] = await this.addressesRepository.completelyDelete({ consumerId: consumer.id })
      // if (deletedAddress) await this.billingDetailsRepository.completelyDelete({ consumerId: consumer.id })

      // const [deletedProfile] = await this.googleProfilesRepository.completelyDelete({ consumerId: consumer.id })
      // if (deletedProfile) await this.completelyDeleteById(consumer.id)

      return true
    }
    this.logger.warn(`Completely deleting entity allowed only in development mode`)
    return true
  }
}
