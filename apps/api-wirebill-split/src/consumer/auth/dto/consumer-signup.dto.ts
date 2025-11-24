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

import { $Enums } from '@remoola/database';

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
  @ApiPropertyOptional({ example: $Enums.LegalStatus.INDIVIDUAL })
  @IsOptional()
  @IsEnum($Enums.LegalStatus)
  legalStatus?: $Enums.LegalStatus;

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
  @ApiProperty({ example: $Enums.OrganizationSize.SMALL })
  @IsEnum($Enums.OrganizationSize)
  size: $Enums.OrganizationSize;
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
  @ApiProperty({ example: $Enums.AccountType.CONTRACTOR, enum: $Enums.AccountType })
  @IsEnum($Enums.AccountType)
  accountType: $Enums.AccountType;

  @Expose()
  @ApiPropertyOptional({ example: $Enums.ContractorKind.INDIVIDUAL, enum: $Enums.ContractorKind })
  @ValidateIf((o) => o.accountType === $Enums.AccountType.CONTRACTOR)
  @IsEnum($Enums.ContractorKind)
  contractorKind?: $Enums.ContractorKind;

  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  howDidHearAboutUs: null | $Enums.HowDidHearAboutUs;

  @Expose()
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  howDidHearAboutUsOther: null | string;

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
      o.accountType === $Enums.AccountType.BUSINESS ||
      (o.accountType === $Enums.AccountType.CONTRACTOR && o.contractorKind === $Enums.ContractorKind.ENTITY),
  )
  @ValidateNested()
  @Type(() => OrganizationDetailsGPT)
  organizationDetails?: OrganizationDetailsGPT;

  // Required for CONTRACTOR + INDIVIDUAL
  @Expose()
  @ApiPropertyOptional({ type: PersonalDetailsGPT })
  @ValidateIf(
    (o) => o.accountType === $Enums.AccountType.CONTRACTOR && o.contractorKind === $Enums.ContractorKind.INDIVIDUAL,
  )
  @ValidateNested()
  @Type(() => PersonalDetailsGPT)
  personalDetails?: PersonalDetailsGPT;
}
