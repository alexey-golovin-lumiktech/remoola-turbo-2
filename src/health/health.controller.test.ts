import { HealthCheckResult, HealthCheckService, HealthIndicatorResult, HttpHealthIndicator, MemoryHealthIndicator } from '@nestjs/terminus'

import { HealthController } from './health.controller'

describe(`HealthController`, () => {
  let controller: HealthController
  let mockHealth: jest.Mocked<HealthCheckService>
  let mockHttp: jest.Mocked<HttpHealthIndicator>
  let mockMemory: jest.Mocked<MemoryHealthIndicator>

  const makeHealthResult = <T extends string>(indicator: HealthIndicatorResult<T>): HealthCheckResult => ({
    status: `ok`,
    info: indicator,
    error: {},
    details: indicator,
  })

  beforeEach(() => {
    mockHealth = { check: jest.fn() } as any
    mockHttp = { pingCheck: jest.fn() } as any
    mockMemory = { checkHeap: jest.fn() } as any

    controller = new HealthController(mockHealth, mockHttp, mockMemory)
  })

  it(`check() should delegate to http.pingCheck via HealthCheckService`, async () => {
    const pingIndicator: HealthIndicatorResult<`aung pyae phyo`> = {
      'aung pyae phyo': {
        status: `up`,
        response: `pong`,
      },
    }
    mockHttp.pingCheck.mockResolvedValue(pingIndicator)
    mockHealth.check.mockResolvedValue(makeHealthResult(pingIndicator))

    const result = await controller.check()

    expect(mockHealth.check).toHaveBeenCalledWith([expect.any(Function)])
    const [callback] = mockHealth.check.mock.calls[0][0] as Array<() => any>

    const cbReturn = await callback()
    expect(mockHttp.pingCheck).toHaveBeenCalledWith(`aung pyae phyo`, `https://www.aungpyaephyo.com`)
    expect(cbReturn).toBe(pingIndicator)

    expect(result).toEqual(makeHealthResult(pingIndicator))
  })

  it(`checkMemory() should delegate to memory.checkHeap via HealthCheckService`, async () => {
    const memoryIndicator: HealthIndicatorResult<`memory_heap`> = {
      memory_heap: {
        status: `up`,
        heapUsed: 12345678,
      },
    }
    mockMemory.checkHeap.mockResolvedValue(memoryIndicator)
    mockHealth.check.mockResolvedValue(makeHealthResult(memoryIndicator))

    const result = await controller.checkMemory()

    expect(mockHealth.check).toHaveBeenCalledWith([expect.any(Function)])
    const [callback] = mockHealth.check.mock.calls[0][0] as Array<() => any>

    const cbReturn = await callback()
    expect(mockMemory.checkHeap).toHaveBeenCalledWith(`memory_heap`, 150 * 1024 * 1024)
    expect(cbReturn).toBe(memoryIndicator)
    expect(result).toEqual(makeHealthResult(memoryIndicator))
  })
})
