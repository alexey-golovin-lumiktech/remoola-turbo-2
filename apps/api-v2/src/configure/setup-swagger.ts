import { type INestApplication } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';

import { AdminV2Module } from '../admin-v2/admin-v2.module';
import { ConsumerModule } from '../consumer/consumer.module';
import {
  buildSwaggerCookieAuthDocumentConfig,
  buildSwaggerCookieAuthScript,
  swaggerCookieAuthCustomCss,
} from '../swagger-cookie-auth';

function linkTo(kind: `Consumer` | `Admin`): string {
  const lookup = {
    Consumer: `/docs/consumer`,
    Admin: `/docs/admin`,
  };

  return `<a rel="noopener noreferrer" target="_self" href="${lookup[kind]}" style="color:#93c5fd">(${kind} api)</a>`;
}

const swaggerUiBaseOptions = {
  customfavIcon: `https://avatars.githubusercontent.com/u/6936373?s=200&v=4`,
  customJs: [
    `https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.1.3/swagger-ui-bundle.js`,
    `https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.1.3/swagger-ui-standalone-preset.js`,
  ],
  customCssUrl: [`https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.1.3/swagger-ui.css`],
  customCss: swaggerCookieAuthCustomCss,
  swaggerOptions: {
    withCredentials: true,
  },
};

export function setupSwagger(app: INestApplication): void {
  const adminConfig = buildSwaggerCookieAuthDocumentConfig(`admin`, linkTo(`Consumer`));

  const adminDocument = SwaggerModule.createDocument(app, adminConfig, {
    include: [AdminV2Module],
    deepScanRoutes: true,
  });

  SwaggerModule.setup(`docs/admin`, app, adminDocument, {
    ...swaggerUiBaseOptions,
    customJsStr: buildSwaggerCookieAuthScript(`admin`),
    jsonDocumentUrl: `docs/admin-api-json`,
  });

  const consumerConfig = buildSwaggerCookieAuthDocumentConfig(`consumer`, linkTo(`Admin`));

  const consumerDocument = SwaggerModule.createDocument(app, consumerConfig, {
    include: [ConsumerModule],
    deepScanRoutes: true,
  });

  SwaggerModule.setup(`docs/consumer`, app, consumerDocument, {
    ...swaggerUiBaseOptions,
    customJsStr: buildSwaggerCookieAuthScript(`consumer`),
    jsonDocumentUrl: `docs/consumer-api-json`,
  });
}
