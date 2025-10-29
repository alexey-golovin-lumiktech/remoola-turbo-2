import { mkdirSync, writeFileSync } from 'fs';

import { VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { SharedModule } from './shared/shared.module';
import { V1Module } from './v1/v1.module';
import { V2Module } from './v2/v2.module';

async function generateOpenAPI() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: {
      origin: true,
      credentials: true,
    },
    logger: false,
  });
  app.setGlobalPrefix(`api`);

  const versionsConfig = [
    {
      version: `1`,
      module: V1Module,
      description: `<a href="/docs/v2" style="color:#93c5fd">Switch to Remoola API v2</a>`,
    },
    {
      version: `2`,
      module: V2Module,
      description: `<a href="/docs/v1" style="color:#93c5fd">Switch to Remoola API v1</a>`,
    },
  ];

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: versionsConfig.map((x) => x.version),
  });

  const setupSwagger = ({ version, module, description }: (typeof versionsConfig)[0]) => {
    const title = `Remoola API v${version}`;
    const config = new DocumentBuilder() //
      .setTitle(title)
      .setVersion(version)
      .setDescription(description)
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      include: [module, SharedModule], // ✅ this is crucial
      deepScanRoutes: true,
      autoTagControllers: true,
    });

    mkdirSync(`./dist/api-json`, { recursive: true });
    writeFileSync(`./dist/api-json/v${version}.json`, JSON.stringify(document, null, 2));
  };

  versionsConfig.forEach((params) => setupSwagger(params));

  await app.close();
}
generateOpenAPI()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`❌ Failed to generate OpenAPI schema`, err);
    process.exit(1);
  });
