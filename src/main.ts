import { INestApplication, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory, Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { DocumentBuilder, SwaggerCustomOptions, SwaggerModule } from '@nestjs/swagger'
import { classToPlain, plainToClass } from 'class-transformer'

import { ListResponse } from './dtos/common'
import { AppModule } from './app.module'
import { swaggerDocExpansion } from './shared-types'
import { checkProvidedEnvs } from './utils'

import { AdminModule } from 'src/admin/admin.module'
import { AdminsService } from 'src/admin/entities/admins/admins.service'
import { ConsumerModule } from 'src/consumer/consumer.module'
import { ConsumersService } from 'src/consumer/entities/consumer/consumer.service'
import { ADMIN, CONSUMER } from 'src/dtos'
import { HttpExceptionFilter } from 'src/filters'
import { AuthGuard } from 'src/guards/auth.guard'
import { TransformResponseInterceptor } from 'src/interceptors/response.interceptor'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    cors: { origin: true, exposedHeaders: [`Content-Range`, `Content-Type`], credentials: true },
  })

  const customSiteTitle = `Wirebill`
  const config = new DocumentBuilder()
    .setTitle(customSiteTitle)
    .setDescription(`Wirebill REST API`)
    .addBasicAuth()
    .setVersion(`1.0.0`)
    .build()

  const document = SwaggerModule.createDocument(app, config, {
    deepScanRoutes: true,
    include: [AdminModule, ConsumerModule],
    extraModels: [...Object.values(ADMIN), ...Object.values(CONSUMER), ListResponse],
  })
  const options: SwaggerCustomOptions = { swaggerOptions: { docExpansion: swaggerDocExpansion.None }, customSiteTitle }
  SwaggerModule.setup(`documentation`, app, document, options)

  app.enableCors()
  app.useGlobalFilters(new HttpExceptionFilter())

  const reflector = app.get(Reflector)
  const jwtService = app.get(JwtService)
  const consumersService = app.get(ConsumersService)
  const adminsService = app.get(AdminsService)
  app.useGlobalGuards(new AuthGuard(reflector, jwtService, consumersService, adminsService))
  app.useGlobalInterceptors(new TransformResponseInterceptor(reflector))

  app.useGlobalPipes(
    new ValidationPipe({
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
  const PORT = configService.get<number>(`PORT`)
  const startMessage = `Server started on = http://localhost:${PORT}`
  const cb = () => (checkProvidedEnvs(process.cwd())(), console.log(startMessage))
  await app.listen(PORT, cb)
  return app
}

bootstrap()
  .then(killAppWithGrace)
  .catch((error: any) => console.error({ error, caller: bootstrap.name, message: `Error on startup` }))

interface IOptions {
  cleanup?: boolean
  exit?: boolean
}

function killAppWithGrace(app: INestApplication) {
  async function exitHandler(options: IOptions, exitCode?: number) {
    if (options.cleanup) console.log(`App stopped: clean`)
    if (exitCode || exitCode === 0) console.log(`App stopped: exit code: ${exitCode}`)
    setTimeout(() => process.exit(1), 5000)
    await app.close()
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
