import { BadRequestException, HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
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
import { AppModule } from './app.module'
import { ADMIN, CONSUMER } from './dtos'
import { HttpExceptionFilter } from './filters'
import { TransformResponseInterceptor } from './interceptors'
import { checkProvidedEnvs } from './utils'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: [/localhost/, /\.vercel.app/, /\.ngrok-free.app/],
      exposedHeaders: [`Content-Range`, `Content-Type`],
      credentials: true,
    },
    rawBody: true,
  })

  const customSiteTitle = `Wirebill`
  const config = new DocumentBuilder()
    .addBearerAuth({ type: `http`, name: `authorization`, scheme: `basic` }, `basic`)
    .addBearerAuth({ type: `http`, name: `authorization`, scheme: `bearer` }, `bearer`)
    .setTitle(customSiteTitle)
    .setDescription(`Wirebill REST API`)
    .setVersion(`1.0.0`)
    .build()

  const document = SwaggerModule.createDocument(app, config, {
    deepScanRoutes: true,
    include: [AdminCommonModule, ConsumerCommonModule],
    extraModels: [...Object.values(ADMIN), ...Object.values(CONSUMER), ListResponse],
  })
  const options: SwaggerCustomOptions = {
    swaggerOptions: { docExpansion: `none` },
    customSiteTitle,
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

  app.enableCors()

  const reflector = app.get(Reflector)
  const jwtService = app.get(JwtService)
  const consumersService = app.get(ConsumerService)
  const adminsService = app.get(AdminService)
  app.useGlobalGuards(new AuthGuard(reflector, jwtService, consumersService, adminsService))
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

  const configService = app.get(ConfigService)
  const NEST_APP_PORT = configService.get<number>(`NEST_APP_PORT`)
  const NEST_APP_HOST = configService.get<string>(`NEST_APP_HOST`) ?? `localhost`

  const dbConfig = knexfile[configService.get<string>(`NODE_ENV`)]
  const dbConnectionMessage = [`Database:`, JSON.stringify(dbConfig.connection, null, 2)]
  const startMessage = `Server started on = http://${NEST_APP_HOST}:${NEST_APP_PORT}`
  const cb = () => (checkProvidedEnvs(process.cwd())(), console.log(startMessage), console.log(...dbConnectionMessage))
  await app.listen(NEST_APP_PORT, NEST_APP_HOST, cb)
  return app
}

// eslint-disable-next-line
bootstrap().then(killAppWithGrace).catch((e: any) => console.error(e.message ?? `Bootstrap err`))

function killAppWithGrace(app: INestApplication) {
  async function exitHandler(options: IOptions, exitCode?: number) {
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
type IOptions = { cleanup?: boolean; exit?: boolean }
