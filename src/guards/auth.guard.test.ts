import { BadRequestException, HttpStatus, INestApplication, ValidationError, ValidationPipe } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { Test, TestingModule } from '@nestjs/testing'
import { classToPlain, plainToClass } from 'class-transformer'
import { camelCase, startCase } from 'lodash'
import supertest from 'supertest'

import { AdminService } from '../admin/entities/admin/admin.service'
import { AppModule } from '../app.module'
import { ConsumerService } from '../consumer/entities/consumer/consumer.service'
import { HttpExceptionFilter } from '../filters'
import { TransformResponseInterceptor } from '../interceptors'
import { AccessRefreshTokenRepository } from '../repositories'

import { AuthGuard } from './auth.guard'

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

  it(`me`, async () => {
    const email = `simplelogin-newsletter.djakm@simplelogin.com`
    const credentials = { email, password: email }
    const headers = { authorization: `Basic ` + Buffer.from(credentials.email + `:` + credentials.password).toString(`base64`) }
    const result = await supertest
      .agent(app.getHttpServer())
      .post(`/consumer/auth/login`)
      .set({
        accept: `application/json`,
        'content-type': `application/json`,
        'x-testing-rate-limit': `testing_pass`,
        ...headers,
      })
    expect(result.body.id).toBeDefined()
    expect(result.body.accessToken).toBeDefined()
    expect(result.body.refreshToken).toBeDefined()
    expect(result.body.email).toBeDefined()
    expect(result.body.email).toBe(email)
    expect(result.body).toMatchObject({ email })
  })
})
