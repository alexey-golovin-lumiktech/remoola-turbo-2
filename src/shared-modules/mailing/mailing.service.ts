import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MailerService } from '@nestjs-modules/mailer'

@Injectable()
export class MailingService {
  private readonly logger = new Logger(MailingService.name)

  constructor(private mailerService: MailerService, private configService: ConfigService) {}

  async sendConsumerSignupCompletion(params: { email: string; token: string }) {
    const html = this.generateConfirmationEmailTemplate(params.token)
    const subject = `Welcome to Wirebill! Confirm your Email`
    try {
      const sent = await this.mailerService.sendMail({ to: params.email, subject, html })

      this.logger.log(`Sent success`, sent)
    } catch (error) {
      this.logger.error(error)
    }
  }

  private generateConfirmationEmailTemplate(token: string) {
    const feLink = `http://localhost:8080/consumers/auth/signup/verification?token=${token}`
    const html = `
    <table style="max-width:600px;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-style:italic;background:#3f3f3f;color:#ffffff;border-radius:20px;">
      <tbody><tr><td>
        <div style="text-align:center;font-size:18px;font-weight:bold;color:#ffffff;">Welcome to Wirebill.</div>
        <div>&nbsp;</div>
        <div style="color:#ffffff;">You have initialized the signup flow.<div>To&nbsp;continue&nbsp;<a href="${feLink}">Click here to confirm your email</a></div></div>
        <div>&nbsp;</div>
        <div style="margin-left:200px;text-align:right;color:#ffffff">
          If it was not you and the email came to you by mistake, just ignore it.
          <div style="color:#ffffff;">Best&nbsp;regards&nbsp;<a href="mailto:support@wirebill.com">support@wirebill.com</a>.
        </div>
        </div>
      </td></tr></tbody>
    </table>
    `

    return html
  }
}
