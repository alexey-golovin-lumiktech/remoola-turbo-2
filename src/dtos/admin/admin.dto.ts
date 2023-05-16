import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger'
import { Exclude, Expose } from 'class-transformer'
import { IsDate, IsIn, IsString, ValidateIf } from 'class-validator'

import { adminType, IAdminModel } from 'src/models'
import { ValueOf } from 'src/shared-types'

class Admin implements IAdminModel {
  @Expose()
  @IsString()
  @ApiProperty()
  id: string

  @Expose()
  @IsString()
  @ApiProperty()
  email: string

  @Expose()
  @IsIn(Object.keys(adminType))
  @ApiProperty({ enum: Object.keys(adminType) })
  type: ValueOf<typeof adminType>

  @Expose()
  @IsString()
  @ApiProperty()
  password: string

  @Exclude()
  @IsString()
  salt: string

  @Expose()
  @IsDate()
  @ApiProperty()
  createdAt: Date

  @Expose()
  @IsDate()
  @ApiProperty()
  updatedAt: Date

  @Expose()
  @ValidateIf(({ value }) => value != null)
  @IsDate()
  @ApiPropertyOptional({ default: null })
  deletedAt?: Date
}

export class AdminResponse extends Admin {}
export class CreateAdminRequest extends PickType(Admin, [`email`, `password`, `type`] as const) {}
export class UpdateAdminRequest extends CreateAdminRequest {}
