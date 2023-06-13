import { Inject, Injectable, Logger } from '@nestjs/common'
import { generatePdf } from '@wirebill/pdf-generator-package'
import { InjectStripe } from 'nestjs-stripe'
import Stripe from 'stripe'

import { BaseService } from '../../../common'
import { CONSUMER } from '../../../dtos'
import { BaseModel } from '../../../dtos/common'
import { IConsumerModel, IInvoiceModel, TABLE_NAME } from '../../../models'
import { MailingService } from '../../../shared-modules/mailing/mailing.service'
import { currencyCode, currencyCodeVariants, invoiceType } from '../../../shared-types'
import { calculateInvoiceTotalAndSubtotal, getKnexCount, invoiceToHtml, plainToInstance } from '../../../utils'
import { ConsumersService } from '../consumers/consumer.service'
import { InvoiceItemsService } from '../invoice-items/invoice-items.service'

import { InvoicesRepository } from './invoices.repository'

@Injectable()
export class InvoicesService extends BaseService<IInvoiceModel, InvoicesRepository> {
  private readonly logger = new Logger(InvoicesService.name)
  private readonly defaultTax = 2.9 // need to check
  private allowSendEmail = true

  constructor(
    @Inject(InvoicesRepository) repository: InvoicesRepository,
    @Inject(ConsumersService) private readonly consumersService: ConsumersService,
    @Inject(InvoiceItemsService) private readonly itemsService: InvoiceItemsService,
    @InjectStripe() private readonly stripe: Stripe,
    @Inject(MailingService) private readonly mailingService: MailingService,
  ) {
    super(repository)
    this.allowSendEmail = true
  }

  async getInvoicesList(identity: IConsumerModel, query: CONSUMER.QueryInvoices): Promise<CONSUMER.InvoicesList> {
    const filter = query.type == invoiceType.incoming ? { refererId: identity.id } : { creatorId: identity.id }

    const baseQuery = this.repository
      .knex(`${TABLE_NAME.Invoices} as invoices`)
      .join(`${TABLE_NAME.Consumers} as creators`, `creators.id`, `invoices.creatorId`)
      .join(`${TABLE_NAME.Consumers} as referrers`, `referrers.id`, `invoices.refererId`)
      .where(filter)

    const count = await baseQuery.clone().count().then(getKnexCount)

    let data: CONSUMER.InvoiceResponse[] = await baseQuery
      .clone()
      .select(`invoices.*`, `creators.email as creator`, `referrers.email as referer`)
      .modify(qb => {
        if (query?.sorting?.direction && query?.sorting?.field) {
          qb.orderBy(query.sorting.field, query.sorting.direction)
        } else {
          qb.orderBy(`updatedAt`, `desc`)
        }

        if (query?.limit) qb.limit(query.limit)
        if (query?.offset) qb.offset(query.offset)
      })

    // eslint-disable-next-line
    data = await Promise.all(data.map(x => this.itemsService.getInvoiceItems({ invoiceId: x.id }).then(items => Object.assign(x, { items }))))

    return { data, count }
  }

  async createInvoiceLocalFirst(identity: IConsumerModel, body: CONSUMER.CreateInvoice): Promise<CONSUMER.InvoiceResponse> {
    const consumerAsReferer = await this.consumersService.upsertConsumer({ email: body.referer })
    const tax = body.tax ?? this.defaultTax
    const { subtotal, total } = calculateInvoiceTotalAndSubtotal(body.items, tax)
    const dbInvoice = await this.repository.create({
      creatorId: identity.id,
      subtotal,
      total,
      tax,
      refererId: consumerAsReferer.id,
      dueDateInDays: body.dueDateInDays,
      currency: currencyCode.USD,
    })

    dbInvoice.items = await this.itemsService.createManyItems(dbInvoice.id, body.items)
    const result = plainToInstance(CONSUMER.InvoiceResponse, { ...dbInvoice, referer: consumerAsReferer.email, creator: identity.email })

    if (this.allowSendEmail) this.mailingService.sendOutgoingInvoiceEmail(result)
    return result
  }

  async createInvoiceStripeFirst(identity: IConsumerModel, body: CONSUMER.CreateInvoice): Promise<CONSUMER.InvoiceResponse> {
    let consumerAsReferer = await this.consumersService.upsertConsumer({ email: body.referer })

    if (!consumerAsReferer.stripeCustomerId) {
      const customer = await this.stripe.customers.create({ email: consumerAsReferer.email })
      consumerAsReferer = await this.consumersService.upsertConsumer({ email: body.referer, stripeCustomerId: customer.id })
    }

    let stripeInvoice = await this.stripe.invoices.create({
      customer: consumerAsReferer.stripeCustomerId,
      auto_advance: true,
      collection_method: `send_invoice`,
      days_until_due: body.dueDateInDays,
      payment_settings: { payment_method_types: [`card`] },
    })

    const stripeInvoiceItems = await Promise.all(
      body.items.map(item =>
        this.stripe.invoiceItems.create({
          invoice: stripeInvoice.id,
          amount: item.amount,
          description: item.description,

          currency: currencyCode.USD,
          customer: consumerAsReferer.stripeCustomerId,
        }),
      ),
    )

    stripeInvoice = await this.stripe.invoices.sendInvoice(stripeInvoice.id)

    const rawInvoice = this.stripeInvoiceToModel(stripeInvoice, consumerAsReferer.id, identity.id)
    const dbInvoice = await this.repository.create(rawInvoice)

    const rawInvoiceItems = stripeInvoiceItems.map(this.stripeInvoiceItemToModel(dbInvoice.id))
    dbInvoice.items = await this.itemsService.repository.createMany(rawInvoiceItems)
    const result = plainToInstance(CONSUMER.InvoiceResponse, { ...dbInvoice, referer: consumerAsReferer.email, creator: identity.email })

    if (this.allowSendEmail) this.mailingService.sendOutgoingInvoiceEmail(result)
    return result
  }

  async getInvoiceByIdToDownload(invoiceId: string) {
    try {
      const invoice: CONSUMER.InvoiceResponse = await this.repository.knex
        .from(`${TABLE_NAME.Invoices} as invoices`)
        .join(`${TABLE_NAME.Consumers} as creator`, `creator.id`, `invoices.creatorId`)
        .join(`${TABLE_NAME.Consumers} as referer`, `referer.id`, `invoices.refererId`)
        .select(`invoices.*`, `creator.email as creator`, `referer.email as referer`)
        .where(`invoices.id`, invoiceId)
        .first()
      const items = await this.repository.knex.from(`${TABLE_NAME.InvoiceItems} as items`).where({ invoiceId })
      const invoiceHtml = invoiceToHtml.processor({ ...invoice, items })
      const buffer = await generatePdf({ rawHtml: invoiceHtml })
      const result = { buffer, variant: `invoice` }
      return result
    } catch (error) {
      this.logger.error(error.message)
      return { buffer: Buffer.from(`Sorry!! An invoice with ID-${invoiceId} does not exist`), variant: `error` }
    }
  }

  private stripeInvoiceItemToModel(invoiceId: string) {
    return (item: Stripe.InvoiceItem): Omit<CONSUMER.InvoiceItem, keyof BaseModel> => ({
      invoiceId: invoiceId,
      description: item.description,
      currency: currencyCodeVariants.find(x => new RegExp(x, `gi`).test(item.currency)) ?? currencyCode.USD,
      amount: item.amount,
      metadata: JSON.stringify(item, null, -1),
    })
  }

  private stripeInvoiceToModel(invoice: Stripe.Invoice, refererId: string, creatorId: string): Omit<CONSUMER.Invoice, keyof BaseModel> {
    return {
      refererId: refererId,
      creatorId: creatorId,
      stripeInvoiceId: invoice.id,
      status: invoice.status,
      tax: invoice.tax,
      currency: currencyCodeVariants.find(x => new RegExp(x, `gi`).test(invoice.currency)) ?? currencyCode.USD,
      dueDateInDays: invoice.due_date,

      subtotal: invoice.subtotal,
      total: invoice.total,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf,
      metadata: JSON.stringify(invoice, null, -1),
    }
  }
}
