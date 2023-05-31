import { Inject, Injectable, Logger, RawBodyRequest } from '@nestjs/common'
import { plainToInstance } from 'class-transformer'
import { InjectStripe } from 'nestjs-stripe'
import { CONSUMER } from 'src/dtos'
import Stripe from 'stripe'

import { PaymentMethod, paymentMethod } from '../../shared-types'
import { InvoiceItemsService } from '../entities/invoice-items/invoice-items.service'
import { InvoicesService } from '../entities/invoices/invoices.service'

@Injectable()
export class PaymentsService {
  logger = new Logger(PaymentsService.name)
  endpointSecret = `` //EX: `whsec_8043d71fbba1b0a318024e67af2da517c1831c8098e63b82c365ef16859f0c6f`

  constructor(
    @InjectStripe() private readonly stripe: Stripe,
    @Inject(InvoicesService) private invoicesService: InvoicesService,
    @Inject(InvoiceItemsService) private itemsService: InvoiceItemsService,
  ) {
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

    // const data: Stripe.Event.Data = event.data
    // this.logger.debug(`STRIPE HOOK event type ${event.type}, data: ${JSON.stringify(data, null, -1)}`)
    this.logger.debug(`STRIPE HOOK event: "${event.type}"`)
    return { received: true }
  }

  async setupPaymentIntent(body: any): Promise<{ clientSecret: string } | void> {
    if (!process.env) return console.log(`[body]`, body)

    const payment_method_types: PaymentMethod[] = [paymentMethod.card]
    const intent = await this.stripe.setupIntents.create({ payment_method_types })
    return { clientSecret: intent.client_secret }
  }

  async createCheckoutSession(dto: { invoiceId: string; refererEmail: string }): Promise<Stripe.Response<Stripe.Checkout.Session>> {
    // @NOTE  "The Checkout Session's total amount due must add up to at least $0.50 usd"
    // @TODO we should check invoice items total amount to must me greater than 500 cents( $0.50)

    const dbInvoice = await this.invoicesService.repository.findById(dto.invoiceId)
    dbInvoice.items = await this.itemsService.repository.find({ filter: { invoiceId: dto.invoiceId } })
    const invoiceResponse = plainToInstance(CONSUMER.InvoiceResponse, dbInvoice)

    const session = await this.stripe.checkout.sessions.create({
      line_items: invoiceResponse.items.map(x => ({
        price_data: { currency: `usd`, unit_amount: 1000, product_data: { name: x.description } },
        quantity: 1,
      })),
      phone_number_collection: { enabled: true },
      customer_email: dto.refererEmail,
      mode: `payment`,
      customer_creation: `if_required`,
      billing_address_collection: `required`,
      success_url: `http://localhost:3000/success`,
      cancel_url: `http://localhost:3000/cancel`,
    })

    return session
  }
}
