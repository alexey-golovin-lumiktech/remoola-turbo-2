/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SearchResult } from '../models/SearchResult';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AdminService {
    /**
     * @returns any
     * @throws ApiError
     */
    public static adminsControllerSearchV1({
        search,
    }: {
        search: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/admins',
            query: {
                'search': search,
            },
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static adminsControllerGetByIdV1({
        adminId,
    }: {
        adminId: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/admins/{adminId}',
            path: {
                'adminId': adminId,
            },
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static clientsControllerSearchV1({
        search,
    }: {
        search: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/clients',
            query: {
                'search': search,
            },
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static clientsControllerGetByIdV1({
        clientId,
    }: {
        clientId: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/clients/{clientId}',
            path: {
                'clientId': clientId,
            },
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static contractorsControllerSearchV1({
        search,
    }: {
        search: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/contractors',
            query: {
                'search': search,
            },
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static contractorsControllerCreateV1(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/admin/contractors',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static contractorsControllerPatchV1({
        contractorId,
    }: {
        contractorId: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/admin/contractors/{contractorId}',
            path: {
                'contractorId': contractorId,
            },
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static contractorsControllerDeleteV1({
        contractorId,
    }: {
        contractorId: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/contractors/{contractorId}',
            path: {
                'contractorId': contractorId,
            },
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static contractsControllerListV1(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/contracts',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static contractsControllerPatchV1({
        contractId,
    }: {
        contractId: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/admin/contracts/{contractId}',
            path: {
                'contractId': contractId,
            },
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static contractsControllerDeleteV1({
        contractId,
    }: {
        contractId: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/contracts/{contractId}',
            path: {
                'contractId': contractId,
            },
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static documentsControllerSearchV1({
        search,
    }: {
        search: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/documents',
            query: {
                'search': search,
            },
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static documentsControllerDeleteV1({
        documentId,
    }: {
        documentId: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/documents/{documentId}',
            path: {
                'documentId': documentId,
            },
        });
    }
    /**
     * @returns SearchResult
     * @throws ApiError
     */
    public static globalSearchControllerSearchV1({
        search,
    }: {
        search: string,
    }): CancelablePromise<Array<SearchResult>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/global-search',
            query: {
                'search': search,
            },
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static paymentsControllerListV1(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/admin/payments',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static paymentsControllerDeleteV1({
        paymentId,
    }: {
        paymentId: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/admin/payments/{paymentId}',
            path: {
                'paymentId': paymentId,
            },
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static usersControllerPatchV1({
        userId,
    }: {
        userId: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/admin/users/{userId}/role',
            path: {
                'userId': userId,
            },
        });
    }
}
