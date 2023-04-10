import { Controller, Get, Redirect } from '@nestjs/common'
import { ApiExcludeEndpoint } from '@nestjs/swagger'

@Controller()
export class AppController {
  @ApiExcludeEndpoint(true)
  @Get(`/`)
  @Redirect(`/documentation`, 301)
  redirect() { return { url: `/documentation` } /* eslint-disable-line */ }
}
