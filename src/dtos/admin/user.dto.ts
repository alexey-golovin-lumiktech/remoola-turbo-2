import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsBoolean, IsDate, IsString, ValidateIf } from 'class-validator'
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
  @IsBoolean()
  verified: boolean

  @Expose()
  @ApiProperty()
  @IsString()
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
  @ValidateIf(({ value }) => value != null)
  firstName?: string = null

  @Expose()
  @ApiPropertyOptional()
  @IsString()
  @ValidateIf(({ value }) => value != null)
  lastName?: string = null

  @Expose()
  @ApiPropertyOptional()
  @IsString()
  @ValidateIf(({ value }) => value != null)
  middleName?: string = null

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

export class CreateUser extends PickType(User, [`email`, `password`, `verified`, `firstName`, `lastName`, `middleName`]) {}
export class UpdateUser extends CreateUser {}
export class UpdatePassword extends PickType(User, [`password`] as const) {}
