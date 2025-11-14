import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
  ValidateNested,
  IsISO8601,
} from 'class-validator';

import { LegalStatus, OrganizationSize, AccountType, ContractorKind } from '@remoola/database';

export class AddressDetailsGPT {
  @Expose()
  @ApiProperty()
  @IsString()
  postalCode: string;

  @Expose()
  @ApiProperty()
  @IsString()
  country: string;

  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  street?: string;
}

export class PersonalDetailsGPT {
  @Expose()
  @ApiProperty()
  @IsString()
  citizenOf: string;

  @Expose()
  @ApiProperty({ example: `1979-07-25` })
  @IsISO8601()
  dateOfBirth: string;

  @Expose()
  @ApiProperty()
  @IsString()
  passportOrIdNumber: string;

  @Expose()
  @ApiPropertyOptional({ example: LegalStatus.INDIVIDUAL })
  @IsOptional()
  @IsEnum(LegalStatus)
  legalStatus?: LegalStatus;

  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  countryOfTaxResidence?: string;

  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxId?: string;

  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phoneNumber?: string;
}

export class OrganizationDetailsGPT {
  @Expose()
  @ApiProperty()
  @IsString()
  name: string;

  @Expose()
  @ApiProperty()
  @IsString()
  consumerRole: string;

  @Expose()
  @ApiProperty({ example: OrganizationSize.SMALL })
  @IsEnum(OrganizationSize)
  size: OrganizationSize;
}

export class ConsumerSignupGPT {
  @Expose()
  @ApiProperty({ example: `email@email.com` })
  @IsEmail()
  email: string;

  @Expose()
  @ApiProperty({ example: `password@email.com` })
  @MinLength(8)
  @IsString()
  password: string;

  @Expose()
  @ApiProperty({ example: AccountType.CONTRACTOR, enum: AccountType })
  @IsEnum(AccountType)
  accountType: AccountType;

  @Expose()
  @ApiPropertyOptional({ example: ContractorKind.INDIVIDUAL, enum: ContractorKind })
  @ValidateIf((o) => o.accountType === AccountType.CONTRACTOR)
  @IsEnum(ContractorKind)
  contractorKind?: ContractorKind;

  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsOptional()
  @IsString()
  howDidHearAboutUs?: string;

  @Expose()
  @ApiProperty()
  @ValidateNested()
  @Type(() => AddressDetailsGPT)
  addressDetails: AddressDetailsGPT;

  // Required for BUSINESS, or CONTRACTOR + ENTITY
  @Expose()
  @ApiPropertyOptional({ type: OrganizationDetailsGPT })
  @ValidateIf(
    (o) =>
      o.accountType === AccountType.BUSINESS ||
      (o.accountType === AccountType.CONTRACTOR && o.contractorKind === ContractorKind.ENTITY),
  )
  @ValidateNested()
  @Type(() => OrganizationDetailsGPT)
  organizationDetails?: OrganizationDetailsGPT;

  // Required for CONTRACTOR + INDIVIDUAL
  @Expose()
  @ApiPropertyOptional({ type: PersonalDetailsGPT })
  @ValidateIf((o) => o.accountType === AccountType.CONTRACTOR && o.contractorKind === ContractorKind.INDIVIDUAL)
  @ValidateNested()
  @Type(() => PersonalDetailsGPT)
  personalDetails?: PersonalDetailsGPT;
}
