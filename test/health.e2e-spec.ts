import { HttpStatus, INestApplication } from '@nestjs/common'
import { HealthCheckResult, HealthCheckService, HealthIndicatorResult, HttpHealthIndicator, MemoryHealthIndicator } from '@nestjs/terminus'
import { Test, TestingModule } from '@nestjs/testing'
import supertest from 'supertest'

import { HealthController } from '../src/health/health.controller'

describe(`HealthController (e2e)`, () => {
  let app: INestApplication
  let mockHealth: { check: jest.Mock }
  let mockHttp: { pingCheck: jest.Mock }
  let mockMemory: { checkHeap: jest.Mock }

  const makeHealthResult = <T extends string>(indicator: HealthIndicatorResult<T>): HealthCheckResult => ({
    status: `ok`,
    info: indicator,
    error: {},
    details: indicator,
  })

  beforeAll(async () => {
    mockHealth = { check: jest.fn() }
    mockHttp = { pingCheck: jest.fn() }
    mockMemory = { checkHeap: jest.fn() }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealth },
        { provide: HttpHealthIndicator, useValue: mockHttp },
        { provide: MemoryHealthIndicator, useValue: mockMemory },
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it(`/GET /health`, async () => {
    const pingIndicator: HealthIndicatorResult<`aung pyae phyo`> = {
      'aung pyae phyo': {
        status: `up`,
        response: `pong`,
      },
    }
    const expected: HealthCheckResult = makeHealthResult(pingIndicator)
    mockHttp.pingCheck.mockResolvedValue(pingIndicator)
    mockHealth.check.mockResolvedValue(expected)

    await supertest.agent(app.getHttpServer()).get(`/health`).expect(HttpStatus.OK).expect(expected)
  })

  it(`/GET /health/memory`, async () => {
    const memoryIndicator: HealthIndicatorResult<`memory_heap`> = {
      memory_heap: {
        status: `up`,
        heapUsed: 1234567,
      },
    }
    const expected: HealthCheckResult = makeHealthResult(memoryIndicator)
    mockMemory.checkHeap.mockResolvedValue(memoryIndicator)
    mockHealth.check.mockResolvedValue(expected)

    await supertest.agent(app.getHttpServer()).get(`/health/memory`).expect(HttpStatus.OK).expect(expected)
  })
})
