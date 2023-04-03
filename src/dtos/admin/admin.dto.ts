import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger'
import { Exclude, Expose } from 'class-transformer'
import { IsDate, IsEnum, IsString } from 'class-validator'
import { AdminType, IAdminModel } from 'src/models'

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
  @ApiProperty({ enum: AdminType })
  @IsEnum(AdminType)
  type: AdminType

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
  deletedAt?: Date
}

export class CreateAdmin extends PickType(Admin, [`email`, `password`, `type`]) {}
export class UpdateAdmin extends CreateAdmin {}
