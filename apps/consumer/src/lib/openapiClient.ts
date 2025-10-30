import { OpenAPI } from '@remoola/openapi';

/** Configure the generated client to send cookies (no tokens). */
export const configureOpenAPI = () => {
  OpenAPI.BASE = process.env.NEXT_PUBLIC_API_BASE_URL!;
  OpenAPI.WITH_CREDENTIALS = true;
  OpenAPI.CREDENTIALS = `include`;
};
