import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ISendMailOptions, MailerService } from '@nestjs-modules/mailer'

import { generatePdf } from '@wirebill/pdf-generator-package'

import { commonUtils } from '../../common-utils'

@Injectable()
export class MailingService {
  private readonly logger = new Logger(MailingService.name)

  constructor(private mailerService: MailerService, private configService: ConfigService) {}

  async sendConsumerSignupCompletionEmail(params: { email: string; token: string; referer: string }): Promise<void> {
    const backendBaseURL = this.configService.get<string>(`NEST_APP_EXTERNAL_ORIGIN`)
    const emailConfirmationLink = `${backendBaseURL}/consumer/auth/signup/verification?token=${params.token}&referer=${params.referer}`
    const html = commonUtils.emailTemplating.signupCompletionToHtml.processor(emailConfirmationLink)
    const subject = `Welcome to Wirebill! Confirm your Email`
    try {
      const sent = await this.mailerService.sendMail({ to: params.email, subject, html })
      this.logger.log(`Email "${subject}" successfully sent to: ${sent.envelope.to.join(` & `)}`)
    } catch (error) {
      this.logger.error(error)
    }
  }

  async sendOutgoingInvoiceEmail(invoice: any /* CONSUMER.InvoiceResponse */): Promise<void> {
    const html = commonUtils.emailTemplating.outgoingInvoiceToHtml.processor(invoice)
    const content = await generatePdf({ rawHtml: commonUtils.emailTemplating.invoiceToHtml.processor(invoice) })
    const subject = `NEW INVOICE #${invoice.id}`
    const attachments: ISendMailOptions[`attachments`] = [{ content, filename: `invoice-${invoice.id}.pdf` }]
    try {
      const sent = await this.mailerService.sendMail({ to: invoice.referer, subject, html, attachments })
      this.logger.log(`Email "${subject}" successfully sent to: ${sent.envelope.to.join(` & `)}`)
    } catch (error) {
      this.logger.error(error)
    }
  }

  async sendConsumerTemporaryPasswordForGoogleOAuth(params: { email: string; tmpPassword: string }): Promise<void> {
    const html = commonUtils.emailTemplating.googleOAuthtmpPassword.processor(params.tmpPassword)
    const subject = `Welcome to Wirebill! You successfully registered through Google OAuth`
    try {
      const sent = await this.mailerService.sendMail({ to: params.email, subject, html })
      this.logger.log(`Email "${subject}" successfully sent to: ${sent.envelope.to.join(` & `)}`)
    } catch (error) {
      this.logger.error(error)
    }
  }

  async sendForgotPasswordEmail(params: { forgotPasswordLink: string; email: string }): Promise<void> {
    const html = commonUtils.emailTemplating.forgotPassword.processor(params.forgotPasswordLink)
    const subject = `Wirebill. Password recovery`
    try {
      const sent = await this.mailerService.sendMail({ to: params.email, subject, html })
      this.logger.log(`Email "${subject}" successfully sent to: ${sent.envelope.to.join(` & `)}`)
    } catch (error) {
      this.logger.error(error)
    }
  }

  // async sendInvitationEmailForPotentialConsumer(params: { email: string }) {}

  // async sendEmailAboutPayment(params: { email: string }) {}
}
