/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Dashboard } from '../models/Dashboard';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DashboardService {
    /**
     * @returns Dashboard
     * @throws ApiError
     */
    public static dashboardControllerGetV1({
        clientId,
    }: {
        clientId: string,
    }): CancelablePromise<Dashboard> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/consumer/dashboard',
            query: {
                'clientId': clientId,
            },
        });
    }
}
