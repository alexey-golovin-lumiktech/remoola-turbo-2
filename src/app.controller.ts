import { Controller, Get, Redirect } from '@nestjs/common'
import { ApiExcludeEndpoint } from '@nestjs/swagger'

import { PublicEndpoint } from './decorators'

@Controller()
export class AppController {
  @PublicEndpoint()
  @ApiExcludeEndpoint(true)
  @Get()
  @Redirect(`/documentation`, 301)
  redirect() {
    return { url: `/documentation` }
  }
}
