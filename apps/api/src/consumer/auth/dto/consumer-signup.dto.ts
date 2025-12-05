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

import { $Enums } from '@remoola/database-2';

export class AddressDetails {
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

export class PersonalDetails {
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

export class OrganizationDetails {
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

export class ConsumerSignup {
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
  @Type(() => AddressDetails)
  addressDetails: AddressDetails;

  // Required for BUSINESS, or CONTRACTOR + ENTITY
  @Expose()
  @ApiPropertyOptional({ type: OrganizationDetails })
  @ValidateIf(
    (o) =>
      o.accountType === $Enums.AccountType.BUSINESS ||
      (o.accountType === $Enums.AccountType.CONTRACTOR && o.contractorKind === $Enums.ContractorKind.ENTITY),
  )
  @ValidateNested()
  @Type(() => OrganizationDetails)
  organizationDetails?: OrganizationDetails;

  // Required for CONTRACTOR + INDIVIDUAL
  @Expose()
  @ApiPropertyOptional({ type: PersonalDetails })
  @ValidateIf(
    (o) => o.accountType === $Enums.AccountType.CONTRACTOR && o.contractorKind === $Enums.ContractorKind.INDIVIDUAL,
  )
  @ValidateNested()
  @Type(() => PersonalDetails)
  personalDetails?: PersonalDetails;
}
