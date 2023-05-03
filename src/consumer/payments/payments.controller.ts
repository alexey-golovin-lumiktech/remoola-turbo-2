import { Body, Controller, Inject, Post, Headers, Req, RawBodyRequest } from '@nestjs/common'
import { PaymentsService } from './payments.service'
import { ApiTags } from '@nestjs/swagger'

@ApiTags(`consumer`)
@Controller(`consumer/payments`)
export class PaymentsController {
  constructor(@Inject(PaymentsService) private readonly service: PaymentsService) {}

  @Post(`/webhook`)
  webhook(@Headers(`stripe-signature`) signature: string, @Req() req: RawBodyRequest<Request>): Promise<{ received: true }> {
    return this.service.webhook(signature, req)
  }

  @Post(`/setup-payment-intent`)
  setupPaymentIntent(@Body() body: any): Promise<{ clientSecret: string } | void> {
    // see https://github.com/stripe-samples/mobile-saving-card-without-payment/blob/main/server/node/server.js
    return this.service.setupPaymentIntent(body)
  }
}
