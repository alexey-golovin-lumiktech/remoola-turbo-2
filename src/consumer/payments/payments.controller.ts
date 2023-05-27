import { Body, Controller, Headers, Inject, Post, RawBodyRequest, Req } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

import { PublicEndpoint } from '../../decorators'

import { PaymentsService } from './payments.service'

@ApiTags(`consumer`)
@Controller(`consumer/payments`)
export class PaymentsController {
  constructor(@Inject(PaymentsService) private readonly service: PaymentsService) {}

  @PublicEndpoint()
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
