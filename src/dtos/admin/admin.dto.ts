import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger'
import { Exclude, Expose } from 'class-transformer'
import { IsDate, IsIn, IsString, ValidateIf } from 'class-validator'

import { adminType, IAdminModel } from '../../models'
import { ValueOf } from '../../shared-types'

export class Admin implements IAdminModel {
  @Expose()
  @ApiProperty()
  @IsString()
  id: string

  @Expose()
  @ApiProperty()
  @IsString()
  email: string

  @Expose()
  @ApiProperty({ enum: Object.keys(adminType) })
  @IsIn(Object.keys(adminType))
  type: ValueOf<typeof adminType>

  @Expose()
  @ApiProperty()
  @IsString()
  password: string

  @Exclude()
  @IsString()
  salt: string

  @Expose()
  @ApiProperty()
  @IsDate()
  createdAt: Date

  @Expose()
  @ApiProperty()
  @IsDate()
  updatedAt: Date

  @Expose()
  @ApiPropertyOptional()
  @IsDate()
  @ValidateIf(({ value }) => value != null)
  deletedAt?: Date = null
}

export class CreateAdmin extends PickType(Admin, [`email`, `password`, `type`]) {}
export class UpdateAdmin extends CreateAdmin {}
