import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsBoolean, IsDate, IsString } from 'class-validator'
import { IUserModel } from '../../models'
import { Exclude } from 'class-transformer'

export class User implements IUserModel {
  @Expose()
  @ApiProperty()
  @IsString()
  id: string

  @Expose()
  @ApiProperty()
  @IsString()
  email: string

  @Expose()
  @ApiProperty()
  @IsString()
  verified: boolean

  @Expose()
  @ApiProperty()
  @IsBoolean()
  password: string

  @Exclude()
  @IsString()
  salt: string

  @Expose()
  @ApiPropertyOptional()
  @IsString()
  googleProfileId?: string

  @Expose()
  @ApiPropertyOptional()
  @IsString()
  firstName?: string

  @Expose()
  @ApiPropertyOptional()
  @IsString()
  lastName?: string

  @Expose()
  @ApiPropertyOptional()
  @IsString()
  middleName?: string

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

export class CreateUser extends PickType(User, [`email`, `password`, `verified`, `firstName`, `lastName`, `middleName`]) {}
export class UpdateUser extends CreateUser {}
export class UpdatePassword extends PickType(User, [`password`] as const) {}
