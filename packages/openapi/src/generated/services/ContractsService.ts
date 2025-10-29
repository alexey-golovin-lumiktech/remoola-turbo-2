/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateContract } from '../models/CreateContract';
import type { UpdateContract } from '../models/UpdateContract';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ContractsService {
    /**
     * @returns any
     * @throws ApiError
     */
    public static contractsControllerListV1({
        clientId,
        search,
    }: {
        clientId: string,
        search: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/consumer/contracts',
            query: {
                'clientId': clientId,
                'search': search,
            },
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static contractsControllerCreateV1({
        requestBody,
    }: {
        requestBody: CreateContract,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/consumer/contracts',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static contractsControllerUpdateV1({
        id,
        requestBody,
    }: {
        id: string,
        requestBody: UpdateContract,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/consumer/contracts/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
