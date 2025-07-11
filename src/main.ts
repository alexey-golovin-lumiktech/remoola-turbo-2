import { BadRequestException, HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common'
import { NestFactory, Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { DocumentBuilder, SwaggerCustomOptions, SwaggerModule } from '@nestjs/swagger'
import { classToPlain, plainToClass } from 'class-transformer'
import { ValidationError } from 'class-validator'
import { camelCase, startCase } from 'lodash'

import * as knexfile from '../knexfile'

import { AdminCommonModule } from './admin/admin-common.module'
import { AdminService } from './admin/entities/admin/admin.service'
import { ConsumerCommonModule } from './consumer/consumer-common.module'
import { ConsumerService } from './consumer/entities/consumer/consumer.service'
import { ListResponse } from './dtos/common'
import { AuthGuard } from './guards/auth.guard'
import { HealthModule } from './health/health.module'
import { AppModule } from './app.module'
import { ADMIN, CONSUMER } from './dtos'
import { envs } from './envs'
import { HttpExceptionFilter } from './filters'
import { TransformResponseInterceptor } from './interceptors'
import { AccessRefreshTokenRepository } from './repositories'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: [/127.0.0.1/, /\.vercel.app/, /\.ngrok-free.app/],
      exposedHeaders: [`Content-Range`, `Content-Type`],
    },
    rawBody: true,
  })

  const customSiteTitle = `Wirebill`
  const config = new DocumentBuilder()
    .addBasicAuth({ type: `http`, scheme: `basic` }, `basic`)
    .addBearerAuth({ type: `http`, scheme: `bearer` }, `bearer`)
    .setTitle(customSiteTitle)
    .setDescription([`<a rel="noopener noreferrer" target="_self" href="/documentation-json">swagger.json</a>`].join(` `))
    .setVersion(`1.0.0`)
    .build()

  const document = SwaggerModule.createDocument(app, config, {
    deepScanRoutes: true,
    include: [AdminCommonModule, ConsumerCommonModule, HealthModule],
    extraModels: [...Object.values(ADMIN), ...Object.values(CONSUMER), ListResponse],
  })
  const options: SwaggerCustomOptions = {
    swaggerOptions: {
      swagger: `2.0`,
      docExpansion: `none`,
      pathPrefixSize: 2,
      swaggerUI: false,
      grouping: `tags`,
      basePath: `/`,
      documentationPath: `/documentation`,
    },

    customfavIcon: `https://avatars.githubusercontent.com/u/6936373?s=200&v=4`,
    customJs: [
      `https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.1.3/swagger-ui-bundle.js`,
      `https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.1.3/swagger-ui-bundle.min.js`,
      `https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.1.3/swagger-ui-standalone-preset.js`,
      `https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.1.3/swagger-ui-standalone-preset.min.js`,
    ],
    customCssUrl: [
      `https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.1.3/swagger-ui.css`,
      `https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.1.3/swagger-ui.min.css`,
    ],
  }
  SwaggerModule.setup(`documentation`, app, document, options)

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

  const NEST_APP_PORT = envs.NEST_APP_PORT
  const NEST_APP_HOST = envs.NEST_APP_HOST

  process.stdout.write(`[NEST_APP_PORT] ` + NEST_APP_PORT)
  process.stdout.write(`[NEST_APP_HOST] ` + NEST_APP_HOST)

  await app
    .listen(NEST_APP_PORT, NEST_APP_HOST)
    .then(() => console.log(``))
    .then(() => app.getUrl())
    .then(appUrl => console.debug(`Server started on = ${appUrl}`))
    .then(() => console.debug(`Database: ${JSON.stringify(knexfile[envs.NODE_ENV]?.connection)}`))
  return app
}

bootstrap()
  .then(killAppWithGrace)
  .catch(e => console.error(String(e) ?? `Bootstrap err`))

function killAppWithGrace(app: INestApplication) {
  async function exitHandler(options: { cleanup?: boolean; exit?: boolean }, exitCode?: number) {
    await app.close()

    if (options.cleanup) console.log(`App stopped: clean`)
    if (exitCode || exitCode === 0) console.log(`App stopped: exit code: ${exitCode}`)
    setTimeout(() => process.exit(1), 5000)
    process.exit(0)
  }

  process.stdin.resume()
  process.on(`unhandledRejection`, (error: Error | any) => {
    if (error.code == `ERR_HTTP_HEADERS_SENT`) return console.log(`ERR_HTTP_HEADERS_SENT with error code: ${error.code}`)
    console.error({ error, caller: bootstrap.name, message: `Unhandled rejection` })
    process.exit(1)
  })
  process.on(`exit`, exitHandler.bind(null, { cleanup: true }))
  process.on(`SIGINT`, exitHandler.bind(null, { exit: true }))
  process.on(`SIGUSR1`, exitHandler.bind(null, { exit: true }))
  process.on(`SIGUSR2`, exitHandler.bind(null, { exit: true }))
  process.on(`uncaughtException`, exitHandler.bind(null, { exit: true }))
}
