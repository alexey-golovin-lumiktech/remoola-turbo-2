import { ApiProperty } from '@nestjs/swagger'
import { IsBoolean, IsDate, IsEnum, IsString } from 'class-validator'
import { IUserModel, UserType } from '../../models'

export class User implements IUserModel {
  @ApiProperty()
  @IsString()
  id: string

  @ApiProperty()
  @IsString()
  email: string

  @ApiProperty()
  @IsString()
  firstName: string

  @ApiProperty()
  @IsString()
  lastName: string

  @ApiProperty()
  @IsString()
  middleName: string

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
  passwordHash: string

  @ApiProperty()
  @IsString()
  passwordSalt: string

  @ApiProperty()
  @IsString()
  googleProfileId: string

  @ApiProperty()
  @IsDate()
  createdAt: Date

  @ApiProperty()
  @IsDate()
  updatedAt: Date

  @ApiProperty()
  @IsDate()
  deletedAt: Date
}
