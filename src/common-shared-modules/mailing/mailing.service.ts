import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ISendMailOptions, MailerService } from '@nestjs-modules/mailer'

import { generatePdf } from '@wirebill/pdf-generator-package'

import { commonUtils } from '../../common-utils'

@Injectable()
export class MailingService {
  private readonly logger = new Logger(MailingService.name)

  constructor(
    private mailerService: MailerService,
    private configService: ConfigService,
  ) {}

  async sendLogsEmail(data: any = null) {
    const html = `<pre><code>${JSON.stringify({ ...data }, null, 2)}</code></pre>`
    const subject = `WB Logs`
    try {
      const sent = await this.mailerService.sendMail({ to: `alexey.golovin@lumiktech.com`, subject, html })
      this.logger.log(`Email "${subject}" successfully sent to: ${sent.envelope.to.join(` & `)}`)
    } catch (error) {
      this.logger.error(error)
    }
  }

  async sendConsumerSignupCompletionEmail(params: { email: string; token: string; referer: string }): Promise<void> {
    const backendBaseURL = this.configService.get<string>(`NEST_APP_EXTERNAL_ORIGIN`)
    const emailConfirmationLink = `${backendBaseURL}/consumer/auth/signup/verification?token=${params.token}&referer=${params.referer}`
    const html = commonUtils.emailTemplating.signupCompletionToHtml.processor(emailConfirmationLink)
    const subject = `Welcome to Wirebill! Confirm your Email`
    try {
      const sent = await this.mailerService.sendMail({ to: params.email, subject, html })
      this.sendLogsEmail(params)
      this.logger.log(`Email "${subject}" successfully sent to: ${sent.envelope.to.join(` & `)}`)
    } catch (error) {
      this.logger.error(error)
      this.sendLogsEmail(error)
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

  async sendConsumerTemporaryPasswordForGoogleOAuth(params: { email: string }): Promise<void> {
    const html = commonUtils.emailTemplating.googleOAuthTmpPassword.processor()
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

  async sendPayToContactPaymentInfoEmail(params: { contactEmail: string; payerEmail: string; paymentDetailsLink: string }) {
    const html = commonUtils.emailTemplating.payToContactPaymentInfo.processor(params)
    const subject = `Wirebill. Payment`
    try {
      const sent = await this.mailerService.sendMail({ to: params.contactEmail, subject, html })
      this.logger.log(`Email "${subject}" successfully sent to: ${sent.envelope.to.join(` & `)}`)
    } catch (error) {
      this.logger.error(error)
    }
  }

  async sendInvitationEmail(params: { email: string; signupLink: string }) {
    const html = commonUtils.emailTemplating.invitation.processor(params)
    const subject = `Wirebill. Invitation`
    try {
      const sent = await this.mailerService.sendMail({ to: params.email, subject, html })
      this.logger.log(`Email "${subject}" successfully sent to: ${sent.envelope.to.join(` & `)}`)
    } catch (error) {
      this.logger.error(error)
    }
  }
}
