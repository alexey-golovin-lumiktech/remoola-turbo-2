import { BadRequestException, Injectable, RawBodyRequest } from '@nestjs/common'
import { Request } from 'express'
import { InjectStripe } from 'nestjs-stripe'
import Stripe from 'stripe'

@Injectable()
export class PaymentsService {
  endpointSecret = `whsec_8043d71fbba1b0a318024e67af2da517c1831c8098e63b82c365ef16859f0c6f`

  constructor(@InjectStripe() private readonly stripe: Stripe) {}

  async webhook(req: RawBodyRequest<Request>): Promise<void | never> {
    const signature = req.headers[`stripe-signature`]
    let event

    try {
      event = this.stripe.webhooks.constructEvent(req.rawBody, signature, this.endpointSecret)
    } catch (err) {
      throw new BadRequestException(`Webhook Error: ${err.message}`)
    }
    console.log(JSON.stringify({ [event.type]: event.data.object }, null, 2))
  }
}
