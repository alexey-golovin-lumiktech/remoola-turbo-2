/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreatePresignedBody } from '../models/CreatePresignedBody';
import type { DocumentListItem } from '../models/DocumentListItem';
import type { PresignedResponse } from '../models/PresignedResponse';
import type { UploadDocument } from '../models/UploadDocument';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DocumentsService {
    /**
     * @returns DocumentListItem
     * @throws ApiError
     */
    public static documentsControllerListV1({
        clientId,
    }: {
        clientId: string,
    }): CancelablePromise<Array<DocumentListItem>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/consumer/documents',
            query: {
                'clientId': clientId,
            },
        });
    }
    /**
     * @returns DocumentListItem
     * @throws ApiError
     */
    public static documentsControllerUploadV1({
        requestBody,
    }: {
        requestBody: UploadDocument,
    }): CancelablePromise<DocumentListItem> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/consumer/documents',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns PresignedResponse
     * @throws ApiError
     */
    public static documentsControllerPresignedV1({
        requestBody,
    }: {
        requestBody: CreatePresignedBody,
    }): CancelablePromise<PresignedResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/consumer/documents/presigned',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
