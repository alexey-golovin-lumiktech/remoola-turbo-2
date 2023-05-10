import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule, SwaggerCustomOptions } from '@nestjs/swagger'
import { AdminsModule } from './admin/entities/admins/admins.module'
import { AppModule } from './app.module'
import { swaggerDocExpansion } from './common/types'
import * as dtos from './dtos'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { plainToClass, classToPlain } from 'class-transformer'
import { HttpExceptionFilter } from './common/httpException.filter'
import { ConsumerModule } from './consumer/consumer.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    cors: { origin: true, exposedHeaders: [`Content-Range`, `Content-Type`], credentials: true }
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
    include: [AdminsModule, ConsumerModule],
    extraModels: Object.values(dtos)
  })
  const options: SwaggerCustomOptions = { swaggerOptions: { docExpansion: swaggerDocExpansion.None }, customSiteTitle }
  SwaggerModule.setup(`documentation`, app, document, options)

  app.enableCors()
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformerPackage: { plainToClass: plainToClass, classToPlain: classToPlain },
      transformOptions: {
        excludeExtraneousValues: true,
        enableImplicitConversion: true,
        exposeDefaultValues: true,
        exposeUnsetFields: true
      }
    })
  )
  app.useGlobalFilters(new HttpExceptionFilter())

  const configService = app.get(ConfigService)
  const PORT = configService.get<number>(`PORT`)
  await app.listen(PORT, () => console.log(`Server started on = http://localhost:${PORT}`))
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
