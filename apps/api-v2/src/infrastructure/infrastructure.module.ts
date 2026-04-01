import { Module } from '@nestjs/common';

import { NgrokIngressService } from './ngrok/ngrok-ingress.service';

@Module({
  providers: [NgrokIngressService],
  exports: [NgrokIngressService],
})
export class InfrastructureModule {}
