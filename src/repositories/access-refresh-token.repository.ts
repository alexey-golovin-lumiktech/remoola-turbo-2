import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { IAccessRefreshTokenModel, TableName } from '@wirebill/shared-common/models'

import { BaseRepository } from '@-/common'

@Injectable()
export class AccessRefreshTokenRepository extends BaseRepository<Prettified<IAccessRefreshTokenModel>> {
  private readonly logger = new Logger(AccessRefreshTokenRepository.name)

  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.AccessRefreshToken)
  }

  async upsert(dto: {
    accessToken: string
    refreshToken: string
    identityId: string
  }): Promise<Prettified<IAccessRefreshTokenModel> | null> {
    try {
      const exist = await this.findOne({ identityId: dto.identityId })

      if (exist) return await this.updateById(exist.id, dto)
      return await this.create(dto)
    } catch (error: any) {
      this.logger.error(`Failed to upsert access and refresh tokens: ${error.message}`, error.stack)
      throw new InternalServerErrorException(`An error occurred while saving access and refresh tokens`)
    }
  }
}
