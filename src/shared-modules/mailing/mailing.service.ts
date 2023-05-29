import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MailerService } from '@nestjs-modules/mailer'
import moment from 'moment'

import { currencyCode } from '../../constants/currency-code'
import * as CONSUMER from '../../dtos/consumer'
import { currencyFormatters } from '../../utils'

import * as templates from './templates'

@Injectable()
export class MailingService {
  private readonly logger = new Logger(MailingService.name)

  constructor(private mailerService: MailerService, private configService: ConfigService) {}

  async sendConsumerSignupCompletionEmail(params: { email: string; token: string }) {
    const beLink = `http://localhost:8080/consumer/auth/signup/verification?token=${params.token}`
    const html = templates.auth.signupCompletionTemplate.html.replace(new RegExp(`{{beLink}}`, `g`), beLink)
    const subject = `Welcome to Wirebill! Confirm your Email`
    try {
      const sent = await this.mailerService.sendMail({ to: params.email, subject, html })
      this.logger.log(`Sent success`, sent)
    } catch (error) {
      this.logger.error(error)
    }
  }

  async sendOutgoingInvoiceEmail(invoice: CONSUMER.InvoiceResponse & { dueDate: Date }) {
    const html = this.getInvoiceHtml(invoice)
    const subject = `${invoice.creator} require payment from ${invoice.referer}`
    try {
      const sent = await this.mailerService.sendMail({ to: invoice.referer, subject, html })
      this.logger.log(`Sent success`, sent)
    } catch (error) {
      this.logger.error(error)
    }
  }

  getInvoiceHtml(invoice: CONSUMER.InvoiceResponse & { dueDate: Date }): string {
    const itemsHtml = invoice.items.map(item => this.getInvoiceItemHtml(item, invoice.tax)).join(`\n`)
    const payOnlineBeLink = `http://some-link`
    const formatter = currencyFormatters[currencyCode.USD]
    return templates.invoicing.invoice.html
      .replace(new RegExp(`{{id}}`, `g`), invoice.id)
      .replace(new RegExp(`{{createdAt}}`, `g`), moment(invoice.createdAt).format(`ll`))
      .replace(new RegExp(`{{dueDate}}`, `g`), moment(invoice.dueDate).format(`ll`))
      .replace(new RegExp(`{{creator}}`, `g`), invoice.creator)
      .replace(new RegExp(`{{referer}}`, `g`), invoice.referer)
      .replace(new RegExp(`{{total}}`, `g`), formatter.format(invoice.total))
      .replace(new RegExp(`{{subtotal}}`, `g`), formatter.format(invoice.subtotal))
      .replace(new RegExp(`{{payOnlineBeLink}}`, `g`), payOnlineBeLink)
      .replace(new RegExp(`{{itemsHtml}}`, `g`), itemsHtml)
  }

  getInvoiceItemHtml(item: CONSUMER.InvoiceItem, tax: CONSUMER.InvoiceResponse[`tax`]): string {
    let subtotal = item.amount
    if (tax) subtotal = item.amount + (item.amount / 100) * tax

    const formatter = currencyFormatters[currencyCode.USD]
    return templates.invoicing.invoiceItem.html
      .replace(new RegExp(`{{description}}`, `g`), item.description)
      .replace(new RegExp(`{{amount}}`, `g`), formatter.format(item.amount))
      .replace(new RegExp(`{{subtotal}}`, `g`), formatter.format(subtotal))
      .replace(new RegExp(`{{tax}}`, `g`), tax ? tax + `%` : `--`)
  }
}
