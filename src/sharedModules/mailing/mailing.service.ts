import { MailerService } from '@nestjs-modules/mailer'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class MailingService {
  logger = new Logger(MailingService.name)

  constructor(private mailerService: MailerService, private configService: ConfigService) {}

  async sendUserConfirmation(params: { email: string; replacements: { confirmationCode: number | string } }) {
    const html = this.generateEmailTemplate(params.replacements)
    const subject = `Welcome to Wirebill! Confirm your Email`
    try {
      const sent = await this.mailerService.sendMail({ to: params.email, subject, html })

      this.logger.log(`Sent success`, sent)
    } catch (error) {
      this.logger.error(error)
    }
  }

  private generateEmailTemplate(replacements: object) {
    let html = `
      <div> 
        <div>Welcome to Wirebill app !</>
        <div>To confirm your email follow by the next link</div>
        <code>Confirmation code: {{confirmationCode}} </code>
        <a href="{{feLink}}">Click to and provide confirmation code to confirm your email</a>
      </div>
    `

    const feLink = this.configService.get<string>(`FE_APP_CONFIRMATION_LINK`) ?? `http://localhost:3000/contfirm`

    Object.entries({ ...replacements, feLink }).forEach(([key, value]: [string, string | number]) => {
      const replacePattern = `{{${key}}}`
      html = html.replace(replacePattern, value.toString())
    })

    return html
  }
}
