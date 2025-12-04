import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

import { $Enums } from '@remoola/database';

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
  @ApiProperty()
  setupIntentId: string;
}

// Manual bank / card create DTO
export class CreateManualPaymentMethod {
  @Expose()
  @ApiProperty({ enum: $Enums.PaymentMethodType })
  type: $Enums.PaymentMethodType; // BANK_ACCOUNT or CREDIT_CARD

  @Expose()
  @ApiProperty()
  brand: string; // "Chase", "Bank of America", etc

  @Expose()
  @ApiProperty()
  last4: string;

  @Expose()
  @ApiProperty({ required: false })
  expMonth?: string;

  @Expose()
  @ApiProperty({ required: false })
  expYear?: string;

  @Expose()
  @ApiProperty({ required: false })
  billingName?: string;

  @Expose()
  @ApiProperty({ required: false })
  billingEmail?: string;

  @Expose()
  @ApiProperty({ required: false })
  billingPhone?: string;
}

export class UpdatePaymentMethod {
  @Expose()
  @ApiProperty({ required: false })
  defaultSelected?: boolean;

  @Expose()
  @ApiProperty({ required: false })
  billingName?: string;

  @Expose()
  @ApiProperty({ required: false })
  billingEmail?: string;

  @Expose()
  @ApiProperty({ required: false })
  billingPhone?: string;
}
