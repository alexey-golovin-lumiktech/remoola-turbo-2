/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { StartPayment } from '../models/StartPayment';
import type { UpdatePaymentStatus } from '../models/UpdatePaymentStatus';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PaymentsService {
    /**
     * @returns any
     * @throws ApiError
     */
    public static paymentsControllerListV1({
        clientId,
    }: {
        clientId: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/consumer/payments',
            query: {
                'clientId': clientId,
            },
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static paymentsControllerStartV1({
        requestBody,
    }: {
        requestBody: StartPayment,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/consumer/payments',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static paymentsControllerPatchV1({
        id,
        requestBody,
    }: {
        id: string,
        requestBody: UpdatePaymentStatus,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/consumer/payments/{id}/status',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
