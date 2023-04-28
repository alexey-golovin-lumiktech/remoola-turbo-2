import { Controller, Inject, Post, RawBodyRequest, Req, Res } from '@nestjs/common'
import { PaymentsService } from './payments.service'
import { Request, Response } from 'express'
import { InjectStripe } from 'nestjs-stripe'
import Stripe from 'stripe'
import { ApiTags } from '@nestjs/swagger'

@ApiTags(`consumer`)
@Controller(`consumer/payments`)
export class PaymentsController {
  constructor(
    @InjectStripe() private readonly stripe: Stripe,
    @Inject(PaymentsService) private readonly paymentsService: PaymentsService
  ) {}

  @Post(`/webhook`)
  webhook(@Req() req: RawBodyRequest<Request>, @Res() res: Response) {
    this.paymentsService.webhook(req)
    return res.status(200).send(`ok`)
  }
}
