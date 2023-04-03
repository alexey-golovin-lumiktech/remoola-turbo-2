import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsBoolean, IsDate, IsEnum, IsString } from 'class-validator'
import { IUserModel, UserType } from '../../models'
import { Exclude } from 'class-transformer'

export class User implements IUserModel {
  @Expose()
  @ApiProperty()
  @IsString()
  id: string

  @Expose()
  @ApiProperty({ example: `some@email.com` })
  @IsString()
  email: string

  @Expose()
  @ApiProperty({ enum: UserType, default: UserType.User })
  @IsEnum(UserType)
  userType: UserType

  @Expose()
  @ApiProperty({ default: false })
  @IsBoolean()
  verified: boolean

  @Expose()
  @ApiProperty({ example: `SomeBestPassword123!` })
  @IsString()
  password: string

  @Exclude()
  @IsString()
  salt: string

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
  @ApiPropertyOptional()
  @IsString()
  googleProfileId?: string

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

export class CreateUser extends PickType(User, [`email`, `password`, `userType`, `verified`]) {}
export class UpdateUser extends CreateUser {}
export class UpdatePassword extends PickType(User, [`password`] as const) {}
export class UpdateUserType extends PickType(User, [`userType`] as const) {}
