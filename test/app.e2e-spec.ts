import { BadRequestException, HttpStatus, INestApplication, ValidationError, ValidationPipe } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { Test, TestingModule } from '@nestjs/testing'
import { classToPlain, plainToClass } from 'class-transformer'
import { camelCase, startCase } from 'lodash'
import supertest from 'supertest'

import { AdminService } from '../src/admin/entities/admin/admin.service'
import { AppModule } from '../src/app.module'
import { ConsumerService } from '../src/consumer/entities/consumer/consumer.service'
import { HttpExceptionFilter } from '../src/filters'
import { AuthGuard } from '../src/guards/auth.guard'
import { TransformResponseInterceptor } from '../src/interceptors'
import { AccessRefreshTokenRepository } from '../src/repositories'

describe(`AppController (e2e)`, () => {
  let app: INestApplication

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()

    const reflector = app.get(Reflector)
    const jwtService = app.get(JwtService)
    const consumersService = app.get(ConsumerService)
    const adminsService = app.get(AdminService)
    const accessRefreshTokenRepository = app.get(AccessRefreshTokenRepository)
    app.useGlobalGuards(new AuthGuard(reflector, jwtService, consumersService, adminsService, accessRefreshTokenRepository))
    app.useGlobalInterceptors(new TransformResponseInterceptor(reflector))
    app.useGlobalFilters(new HttpExceptionFilter())

    app.useGlobalPipes(
      new ValidationPipe({
        stopAtFirstError: true,
        exceptionFactory: (validationErrors: ValidationError[] = []) => {
          const statusCode = HttpStatus.BAD_REQUEST
          const statusText = startCase(camelCase(HttpStatus[HttpStatus.BAD_REQUEST]))
          const error = validationErrors.reduce(
            (acc, ctx) => {
              acc.errors = { ...acc.errors, [ctx.property]: Object.values(ctx.constraints).join(`, `) }
              acc.message += Object.values(ctx.constraints).join(`, `)
              return acc
            },
            { message: ``, errors: {}, statusCode, statusText },
          )
          return new BadRequestException(error)
        },
        transform: true,
        transformerPackage: { classToPlain, plainToClass },
        transformOptions: {
          excludeExtraneousValues: true,
          enableImplicitConversion: true,
          exposeDefaultValues: true,
          exposeUnsetFields: true,
        },
      }),
    )

    await app.init()
  })

  afterEach(() => app?.close())

  it(`/ (GET)`, () => supertest.agent(app.getHttpServer()).get(`/`).expect(301))
})
