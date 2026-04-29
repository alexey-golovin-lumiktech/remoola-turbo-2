import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';

import {
  type ConsumerUpdateProfileAddressDetailsPayload,
  type ConsumerUpdateProfileOrganizationDetailsPayload,
  type ConsumerUpdateProfilePayload,
  type ConsumerUpdateProfilePersonalDetailsPayload,
} from '@remoola/api-types';
import { $Enums } from '@remoola/database-2';

const preserveRawField = (field: string) => Transform(({ obj }) => obj?.[field]);

export class UpdateConsumerProfilePersonalDetails implements ConsumerUpdateProfilePersonalDetailsPayload {
  @Expose()
  @ApiProperty({ required: false, isArray: false })
  @preserveRawField(`firstName`)
  @IsOptional()
  @IsString()
  firstName?: string | null;

  @Expose()
  @ApiProperty({ required: false, isArray: false })
  @preserveRawField(`lastName`)
  @IsOptional()
  @IsString()
  lastName?: string | null;

  @Expose()
  @ApiProperty({ required: false, isArray: false })
  @preserveRawField(`citizenOf`)
  @IsOptional()
  @IsString()
  citizenOf?: string | null;

  @Expose()
  @ApiProperty({ required: false, isArray: false })
  @preserveRawField(`passportOrIdNumber`)
  @IsOptional()
  @IsString()
  passportOrIdNumber?: string | null;

  @Expose()
  @ApiProperty({ required: false, enum: $Enums.LegalStatus })
  @preserveRawField(`legalStatus`)
  @IsOptional()
  @IsEnum($Enums.LegalStatus)
  legalStatus?: $Enums.LegalStatus | null;

  @Expose()
  @ApiProperty({ required: false, isArray: false })
  @preserveRawField(`dateOfBirth`)
  @IsOptional()
  @IsString()
  dateOfBirth?: string | null;

  @Expose()
  @ApiProperty({ required: false, isArray: false })
  @preserveRawField(`countryOfTaxResidence`)
  @IsOptional()
  @IsString()
  countryOfTaxResidence?: string | null;

  @Expose()
  @ApiProperty({ required: false, isArray: false })
  @preserveRawField(`taxId`)
  @IsOptional()
  @IsString()
  taxId?: string | null;

  @Expose()
  @ApiProperty({ required: false, isArray: false })
  @preserveRawField(`phoneNumber`)
  @IsOptional()
  @IsString()
  phoneNumber?: string | null;
}

export class UpdateConsumerProfileAddressDetails implements ConsumerUpdateProfileAddressDetailsPayload {
  @Expose()
  @ApiProperty({ required: false, isArray: false })
  @preserveRawField(`postalCode`)
  @IsOptional()
  @IsString()
  postalCode?: string | null;

  @Expose()
  @ApiProperty({ required: false, isArray: false })
  @preserveRawField(`country`)
  @IsOptional()
  @IsString()
  country?: string | null;

  @Expose()
  @ApiProperty({ required: false, isArray: false })
  @preserveRawField(`city`)
  @IsOptional()
  @IsString()
  city?: string | null;

  @Expose()
  @ApiProperty({ required: false, isArray: false })
  @preserveRawField(`street`)
  @IsOptional()
  @IsString()
  street?: string | null;

  @Expose()
  @ApiProperty({ required: false, isArray: false })
  @preserveRawField(`state`)
  @IsOptional()
  @IsString()
  state?: string | null;
}

export class UpdateConsumerProfileOrganizationDetails implements ConsumerUpdateProfileOrganizationDetailsPayload {
  @Expose()
  @ApiProperty({ required: false, isArray: false })
  @preserveRawField(`name`)
  @IsOptional()
  @IsString()
  name?: string | null;

  @Expose()
  @ApiProperty({ required: false, isArray: false })
  @preserveRawField(`size`)
  @IsOptional()
  @IsString()
  size?: string | null;

  @Expose()
  @ApiProperty({ required: false, isArray: false })
  @preserveRawField(`consumerRole`)
  @IsOptional()
  @IsString()
  consumerRole?: string | null;

  @Expose()
  @ApiProperty({ required: false, isArray: false })
  @preserveRawField(`consumerRoleOther`)
  @IsOptional()
  @IsString()
  consumerRoleOther?: string | null;
}

export class UpdateConsumerProfileBody implements ConsumerUpdateProfilePayload {
  @Expose()
  @ApiProperty({ required: false, type: UpdateConsumerProfilePersonalDetails, isArray: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateConsumerProfilePersonalDetails)
  personalDetails?: UpdateConsumerProfilePersonalDetails;

  @Expose()
  @ApiProperty({ required: false, type: UpdateConsumerProfileAddressDetails, isArray: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateConsumerProfileAddressDetails)
  addressDetails?: UpdateConsumerProfileAddressDetails;

  @Expose()
  @ApiProperty({ required: false, type: UpdateConsumerProfileOrganizationDetails, isArray: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateConsumerProfileOrganizationDetails)
  organizationDetails?: UpdateConsumerProfileOrganizationDetails;
}
