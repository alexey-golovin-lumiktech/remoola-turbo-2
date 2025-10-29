import { OpenAPI } from './generated';

export * from './generated';

export function configureOpenAPIForCookies(baseUrl: string) {
  OpenAPI.BASE = baseUrl.replace(/\/$/, ``);
  OpenAPI.WITH_CREDENTIALS = true;
}
