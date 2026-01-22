import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

import { $Enums } from '@remoola/database-2';

export class BillingDetails {
  @Expose()
  @ApiProperty({ nullable: true })
  id: string;

  @Expose()
  @ApiProperty({ nullable: true })
  email: string | null;

  @Expose()
  @ApiProperty({ nullable: true })
  name: string | null;

  @Expose()
  @ApiProperty({ nullable: true })
  phone: string | null;
}

export class PaymentMethodItem {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty({ enum: $Enums.PaymentMethodType })
  type: $Enums.PaymentMethodType;

  @Expose()
  @ApiProperty()
  brand: string;

  @Expose()
  @ApiProperty()
  last4: string;

  @Expose()
  @ApiProperty({ nullable: true })
  expMonth: string | null;

  @Expose()
  @ApiProperty({ nullable: true })
  expYear: string | null;

  @Expose()
  @ApiProperty()
  defaultSelected: boolean;

  @Expose()
  @ApiProperty({ type: BillingDetails, nullable: true })
  billingDetails: BillingDetails | null;
}

export class PaymentMethodsResponse {
  @Expose()
  @ApiProperty({ type: [PaymentMethodItem] })
  items: PaymentMethodItem[];
}

// Stripe SetupIntent create -> response
export class CreateStripeSetupIntentResponse {
  @Expose()
  @ApiProperty()
  clientSecret: string;
}

// Stripe confirm payload
export class ConfirmStripeSetupIntent {
  @Expose()
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  setupIntentId: string;
}

// Manual bank / card create DTO
export class CreateManualPaymentMethod {
  @Expose()
  @IsEnum($Enums.PaymentMethodType)
  @ApiProperty({ enum: $Enums.PaymentMethodType })
  type: $Enums.PaymentMethodType; // BANK_ACCOUNT or CREDIT_CARD

  @Expose()
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  brand: string; // "Chase", "Bank of America", etc

  @Expose()
  @IsNotEmpty()
  @IsString()
  @Length(4, 4)
  @Matches(/^\d{4}$/)
  @ApiProperty()
  last4: string;

  @Expose()
  @IsOptional()
  @IsString()
  @Length(2, 2)
  @Matches(/^(0[1-9]|1[0-2])$/)
  @ApiProperty({ required: false })
  expMonth?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @Length(4, 4)
  @Matches(/^\d{4}$/)
  @ApiProperty({ required: false })
  expYear?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  billingName?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  billingEmail?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  billingPhone?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  stripePaymentMethodId?: string;
}

export class UpdatePaymentMethod {
  @Expose()
  @IsOptional()
  @ApiProperty({ required: false })
  defaultSelected?: boolean;

  @Expose()
  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  billingName?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  billingEmail?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  billingPhone?: string;
}

// DTO for paying with saved payment method
export class PayWithSavedPaymentMethod {
  @Expose()
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: `ID of the saved payment method to use` })
  paymentMethodId: string;
}
