import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsDate, IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator'
import { IUserModel, UserType } from '../../models'

export class User implements IUserModel {
  @ApiProperty()
  @IsString()
  id: string

  @ApiProperty()
  @IsString()
  email: string

  @ApiProperty()
  @IsEnum(UserType)
  userType: UserType

  @ApiProperty()
  @IsBoolean()
  verified: boolean

  @ApiProperty()
  @IsString()
  password: string

  @ApiProperty()
  @IsString()
  salt: string

  @ApiPropertyOptional()
  @IsString()
  firstName?: string

  @ApiPropertyOptional()
  @IsString()
  lastName?: string

  @ApiPropertyOptional()
  @IsString()
  middleName?: string

  @ApiPropertyOptional()
  @IsString()
  googleProfileId?: string

  @ApiProperty()
  @IsDate()
  createdAt: Date

  @ApiProperty()
  @IsDate()
  updatedAt: Date

  @ApiPropertyOptional()
  @IsDate()
  deletedAt?: Date
}

export type IUserCreate = Pick<
  IUserModel,
  | `email` //
  | `userType`
  | `verified`
  | `password`
  | `salt`
  | `googleProfileId`
  | `firstName`
  | `lastName`
  | `middleName`
>

export class UserCreate implements Omit<IUserCreate, `salt`> {
  @ApiProperty()
  @IsEmail()
  email: string

  @ApiProperty()
  @IsEnum(UserType)
  userType: UserType

  @ApiProperty()
  @IsBoolean()
  verified: boolean

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string

  @ApiPropertyOptional()
  @IsString()
  firstName?: string

  @ApiPropertyOptional()
  @IsString()
  lastName?: string

  @ApiPropertyOptional()
  @IsString()
  middleName?: string

  @ApiPropertyOptional()
  @IsString()
  googleProfileId?: string
}
