import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsOptional } from 'class-validator';

export class UpdateConsumerProfilePersonalDetails {
  @Expose()
  @ApiProperty({ required: false, isArray: false })
  firstName?: string | null;

  @Expose()
  @ApiProperty({ required: false, isArray: false })
  lastName?: string | null;

  @Expose()
  @ApiProperty({ required: false, isArray: false })
  citizenOf?: string | null;

  @Expose()
  @ApiProperty({ required: false, isArray: false })
  passportOrIdNumber?: string | null;

  @Expose()
  @ApiProperty({ required: false, isArray: false })
  legalStatus?: string | null;

  @Expose()
  @ApiProperty({ required: false, isArray: false })
  dateOfBirth: string | null;

  @Expose()
  @ApiProperty({ required: false, isArray: false })
  countryOfTaxResidence: string | null;

  @Expose()
  @ApiProperty({ required: false, isArray: false })
  taxId: string | null;

  @Expose()
  @ApiProperty({ required: false, isArray: false })
  phoneNumber: string | null;
}

export class UpdateConsumerProfileAddressDetails {
  @Expose()
  @ApiProperty({ required: false, isArray: false })
  postalCode?: string | null;

  @Expose()
  @ApiProperty({ required: false, isArray: false })
  country?: string | null;

  @Expose()
  @ApiProperty({ required: false, isArray: false })
  city?: string | null;

  @Expose()
  @ApiProperty({ required: false, isArray: false })
  street?: string | null;

  @Expose()
  @ApiProperty({ required: false, isArray: false })
  state?: string | null;
}

export class UpdateConsumerProfileOrganizationDetails {
  @Expose()
  @ApiProperty({ required: false, isArray: false })
  name?: string | null;

  @Expose()
  @ApiProperty({ required: false, isArray: false })
  size?: string | null;

  @Expose()
  @ApiProperty({ required: false, isArray: false })
  registrationNumber?: string | null;
}

export class UpdateConsumerProfileBody {
  @Expose()
  @ApiProperty({ required: false, type: UpdateConsumerProfilePersonalDetails, isArray: false })
  @IsOptional()
  personalDetails?: UpdateConsumerProfilePersonalDetails;

  @Expose()
  @ApiProperty({ required: false, type: UpdateConsumerProfileAddressDetails, isArray: false })
  @IsOptional()
  addressDetails?: UpdateConsumerProfileAddressDetails;

  @Expose()
  @ApiProperty({ required: false, type: UpdateConsumerProfileOrganizationDetails, isArray: false })
  @IsOptional()
  organizationDetails?: UpdateConsumerProfileOrganizationDetails;
}
