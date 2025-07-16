import { Controller, Get } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { HealthCheck, HealthCheckService, HttpHealthIndicator, MemoryHealthIndicator } from '@nestjs/terminus'

import { PublicEndpoint } from '../decorators'

@Controller(`health`)
@ApiTags(`health`)
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @PublicEndpoint()
  @HealthCheck()
  check() {
    return this.health.check([() => this.http.pingCheck(`aung pyae phyo`, `https://www.aungpyaephyo.com`)])
  }

  @Get(`memory`)
  @PublicEndpoint()
  @HealthCheck()
  checkMemory() {
    return this.health.check([() => this.memory.checkHeap(`memory_heap`, 150 * 1024 * 1024)])
  }
}
