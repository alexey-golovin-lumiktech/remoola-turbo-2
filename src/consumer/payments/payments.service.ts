import { Injectable, Logger, RawBodyRequest } from '@nestjs/common'
import { InjectStripe } from 'nestjs-stripe'
import Stripe from 'stripe'

import { PaymentMethod, paymentMethod } from 'src/shared-types'

@Injectable()
export class PaymentsService {
  logger = new Logger(PaymentsService.name)
  endpointSecret = `` //EX: `whsec_8043d71fbba1b0a318024e67af2da517c1831c8098e63b82c365ef16859f0c6f`

  constructor(@InjectStripe() private readonly stripe: Stripe) {
    this.endpointSecret = process.env.WH_ENDPOINT_SECRET ?? ``
  }

  async webhook(signature: string, req: RawBodyRequest<Request>): Promise<{ received: true }> {
    let event: Stripe.Event = req.body as unknown as Stripe.Event

    if (this.endpointSecret?.length) {
      try {
        event = this.stripe.webhooks.constructEvent(req.rawBody, signature, this.endpointSecret)
      } catch {
        this.logger.warn(`⚠️  Webhook signature verification failed.`)
      }
    }

    const data: Stripe.Event.Data = event.data
    this.logger.debug(`event type ${event.type}, data: ${JSON.stringify(data, null, -1)}`)
    return { received: true }
  }

  async setupPaymentIntent(body: any): Promise<{ clientSecret: string } | void> {
    if (!process.env) return console.log(`[body]`, body)

    const payment_method_types: PaymentMethod[] = [paymentMethod.card]
    const intent = await this.stripe.setupIntents.create({ payment_method_types })
    return { clientSecret: intent.client_secret }
  }
}
