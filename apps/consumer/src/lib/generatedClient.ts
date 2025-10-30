import {
  OpenAPI,
  ContractsService,
  PaymentsService,
  DocumentsService,
  DashboardService,
  AuthService,
} from '@remoola/openapi';

export const configureOpenAPI = (getToken: () => string | undefined) => {
  OpenAPI.BASE = process.env.NEXT_PUBLIC_API_BASE_URL || `http://127.0.0.1:3000/api/v1`;
  OpenAPI.TOKEN = getToken(); // automatically called before each request
  OpenAPI.WITH_CREDENTIALS = true;
  OpenAPI.CREDENTIALS = `include`;
};

export { ContractsService, PaymentsService, DocumentsService, DashboardService, AuthService };
