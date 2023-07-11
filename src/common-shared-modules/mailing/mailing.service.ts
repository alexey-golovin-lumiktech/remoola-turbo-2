import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ISendMailOptions, MailerService } from '@nestjs-modules/mailer'

import { generatePdf } from '@wirebill/pdf-generator-package'

import { googleOAuthTemporaryGeneratedStrongPassword, invoiceToHtml, outgoingInvoiceToHtml, signupCompletionToHtml } from '../../utils'

@Injectable()
export class MailingService {
  private readonly logger = new Logger(MailingService.name)

  constructor(private mailerService: MailerService, private configService: ConfigService) {}

  async sendConsumerSignupCompletionEmail(params: { email: string; token: string }): Promise<void> {
    const emailConfirmationLink = `http://localhost:8080/consumer/auth/signup/verification?token=${params.token}`
    const html = signupCompletionToHtml.processor(emailConfirmationLink)
    const subject = `Welcome to Wirebill! Confirm your Email`
    try {
      const sent = await this.mailerService.sendMail({ to: params.email, subject, html })
      this.logger.log(`Sent success`, sent)
    } catch (error) {
      this.logger.error(error)
    }
  }

  async sendOutgoingInvoiceEmail(invoice: any /* CONSUMER.InvoiceResponse */): Promise<void> {
    const html = outgoingInvoiceToHtml.processor(invoice)
    const content = await generatePdf({ rawHtml: invoiceToHtml.processor(invoice) })
    const subject = `NEW INVOICE #${invoice.id}`
    const attachments: ISendMailOptions[`attachments`] = [{ content, filename: `invoice-${invoice.id}.pdf` }]
    try {
      const sent = await this.mailerService.sendMail({ to: invoice.referer, subject, html, attachments })
      this.logger.log(`Sent success`, sent)
    } catch (error) {
      this.logger.error(error)
    }
  }

  async sendConsumerTemporaryPasswordForGoogleOAuth(params: { email: string; temporaryGeneratedStrongPassword: string }): Promise<void> {
    const html = googleOAuthTemporaryGeneratedStrongPassword.processor(params.temporaryGeneratedStrongPassword)
    const subject = `Welcome to Wirebill! You successfully registered through Google OAuth`
    try {
      const sent = await this.mailerService.sendMail({ to: params.email, subject, html })
      this.logger.log(`Sent success`, sent)
    } catch (error) {
      this.logger.error(error)
    }
  }
}
