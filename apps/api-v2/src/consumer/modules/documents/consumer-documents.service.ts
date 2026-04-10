import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { buildConsumerDocumentDownloadUrl } from './document-download-url';
import { PrismaService } from '../../../shared/prisma.service';
import { FileStorageService } from '../files/file-storage.service';

const SINGLE_DRAFT_ATTACHMENT_DELETE_BLOCK_MESSAGE =
  `This document is still attached to a draft payment request. ` +
  `Remove it from the draft before deleting it from Documents.`;
const MULTI_DRAFT_ATTACHMENT_DELETE_BLOCK_MESSAGE =
  `One or more selected documents are still attached to draft payment requests. ` +
  `Remove them from the draft before deleting them from Documents.`;
const SINGLE_NON_DRAFT_ATTACHMENT_DELETE_BLOCK_MESSAGE =
  `This document is attached to a non-draft payment request ` + `and cannot be deleted from Documents.`;
const MULTI_NON_DRAFT_ATTACHMENT_DELETE_BLOCK_MESSAGE =
  `One or more selected documents are attached to non-draft payment requests ` +
  `and cannot be deleted from Documents.`;

type DocumentListItem = {
  id: string;
  name: string;
  size: number;
  createdAt: string;
  downloadUrl: string;
  mimetype: string | null;
  kind: string;
  tags: string[];
  isAttachedToDraftPaymentRequest: boolean;
  attachedDraftPaymentRequestIds: string[];
  isAttachedToNonDraftPaymentRequest: boolean;
  attachedNonDraftPaymentRequestIds: string[];
};

type DocumentListRow = {
  id: string;
  name: string;
  size: number | bigint;
  createdAt: Date;
  mimetype: string | null;
  kind: string;
  tags: string[] | null;
  attachedDraftPaymentRequestIds: string[] | null;
  attachedNonDraftPaymentRequestIds: string[] | null;
  totalCount: number | bigint;
};

@Injectable()
export class ConsumerDocumentsService {
  constructor(
    private prisma: PrismaService,
    private storage: FileStorageService,
  ) {}

  private async assertDraftOwnedPaymentRequest(consumerId: string, paymentRequestId: string) {
    const normalizedPaymentRequestId = paymentRequestId.trim();
    if (!normalizedPaymentRequestId) {
      throw new BadRequestException(`Payment request id is required`);
    }

    const payment = await this.prisma.paymentRequestModel.findFirst({
      where: {
        id: normalizedPaymentRequestId,
        requesterId: consumerId,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!payment) {
      throw new ForbiddenException(errorCodes.PAYMENT_NOT_OWNED);
    }

    if (payment.status !== $Enums.TransactionStatus.DRAFT) {
      throw new BadRequestException(`Only draft payment requests can accept attachments`);
    }

    return payment;
  }

  private async getConsumerEmail(consumerId: string): Promise<string | null> {
    const consumerModel = this.prisma.consumerModel;
    if (!consumerModel || typeof consumerModel.findUnique !== `function`) {
      return null;
    }

    const consumer = await consumerModel.findUnique({
      where: { id: consumerId },
      select: { email: true },
    });

    return consumer?.email?.trim().toLowerCase() ?? null;
  }

  private buildPaymentParticipantWhere(consumerId: string, consumerEmail: string | null) {
    return [
      { requesterId: consumerId },
      { payerId: consumerId },
      ...(consumerEmail
        ? [
            {
              requesterId: null,
              requesterEmail: { equals: consumerEmail, mode: `insensitive` as const },
            },
            {
              payerId: null,
              payerEmail: { equals: consumerEmail, mode: `insensitive` as const },
            },
          ]
        : []),
    ];
  }

  private buildContractRelationshipWhere(consumerId: string, consumerEmail: string | null, contractEmail: string) {
    return {
      AND: [
        { deletedAt: null },
        { OR: this.buildPaymentParticipantWhere(consumerId, consumerEmail) },
        {
          OR: [
            { payer: { email: { equals: contractEmail, mode: `insensitive` as const } } },
            { requester: { email: { equals: contractEmail, mode: `insensitive` as const } } },
            { payerEmail: { equals: contractEmail, mode: `insensitive` as const } },
            { requesterEmail: { equals: contractEmail, mode: `insensitive` as const } },
          ],
        },
      ],
    };
  }

  private buildPaymentParticipantSql(consumerId: string, consumerEmail: string | null) {
    return consumerEmail
      ? Prisma.sql`
          (
            pr.requester_id::text = ${consumerId}
            OR pr.payer_id::text = ${consumerId}
            OR (pr.requester_id IS NULL AND LOWER(COALESCE(pr.requester_email, '')) = LOWER(${consumerEmail}))
            OR (pr.payer_id IS NULL AND LOWER(COALESCE(pr.payer_email, '')) = LOWER(${consumerEmail}))
          )
        `
      : Prisma.sql`
          (
            pr.requester_id::text = ${consumerId}
            OR pr.payer_id::text = ${consumerId}
          )
        `;
  }

  private buildDocumentKindSql(nameSql: Prisma.Sql) {
    return Prisma.sql`
      CASE
        WHEN LOWER(${nameSql}) LIKE '%w9%' OR LOWER(${nameSql}) LIKE '%w-9%' THEN 'COMPLIANCE'
        WHEN LOWER(${nameSql}) LIKE '%contract%' THEN 'CONTRACT'
        WHEN LOWER(${nameSql}) LIKE '%invoice%' THEN 'PAYMENT'
        ELSE 'GENERAL'
      END
    `;
  }

  private formatDocumentRows(
    rows: DocumentListRow[],
    backendBaseUrl?: string,
  ): { items: DocumentListItem[]; total: number } {
    const total = rows.length > 0 ? Number(rows[0].totalCount) : 0;
    return {
      items: rows.map((row) => {
        const attachedDraftPaymentRequestIds = row.attachedDraftPaymentRequestIds ?? [];
        const attachedNonDraftPaymentRequestIds = row.attachedNonDraftPaymentRequestIds ?? [];
        return {
          id: row.id,
          name: row.name,
          size: Number(row.size),
          createdAt: row.createdAt.toISOString(),
          downloadUrl: buildConsumerDocumentDownloadUrl(row.id, backendBaseUrl),
          mimetype: row.mimetype,
          kind: row.kind,
          tags: row.tags ?? [],
          isAttachedToDraftPaymentRequest: attachedDraftPaymentRequestIds.length > 0,
          attachedDraftPaymentRequestIds,
          isAttachedToNonDraftPaymentRequest: attachedNonDraftPaymentRequestIds.length > 0,
          attachedNonDraftPaymentRequestIds,
        };
      }),
      total,
    };
  }

  private async getDocumentsRaw(params: {
    consumerId: string;
    consumerEmail: string | null;
    safePage: number;
    safePageSize: number;
    kindFilter: string | null;
    backendBaseUrl?: string;
    contractEmail?: string;
  }): Promise<{ items: DocumentListItem[]; total: number; page: number; pageSize: number }> {
    const { consumerId, consumerEmail, safePage, safePageSize, kindFilter, backendBaseUrl, contractEmail } = params;
    const offset = (safePage - 1) * safePageSize;
    const participantSql = this.buildPaymentParticipantSql(consumerId, consumerEmail);

    if (contractEmail) {
      if (kindFilter && kindFilter !== `PAYMENT`) {
        return { items: [], total: 0, page: safePage, pageSize: safePageSize };
      }

      const rows = await this.prisma.$queryRaw<DocumentListRow[]>(Prisma.sql`
        WITH scoped_payments AS (
          SELECT
            pr.id,
            pr.status
          FROM payment_request pr
          LEFT JOIN consumer requester ON requester.id = pr.requester_id
          LEFT JOIN consumer payer ON payer.id = pr.payer_id
          WHERE pr.deleted_at IS NULL
            AND ${participantSql}
            AND (
              LOWER(COALESCE(requester.email, pr.requester_email, '')) = LOWER(${contractEmail})
              OR LOWER(COALESCE(payer.email, pr.payer_email, '')) = LOWER(${contractEmail})
            )
        ),
        resource_tags AS (
          SELECT
            rt.resource_id,
            COALESCE(array_agg(DISTINCT dt.name ORDER BY dt.name), ARRAY[]::text[]) AS tags
          FROM resource_tag rt
          JOIN document_tag dt ON dt.id = rt.tag_id
          GROUP BY rt.resource_id
        ),
        contract_docs AS (
          SELECT
            r.id,
            r.original_name AS name,
            r.size,
            COALESCE(r.created_at, MAX(pra.created_at)) AS created_at,
            r.mimetype,
            'PAYMENT'::text AS kind,
            COALESCE(
              array_remove(
                array_agg(DISTINCT CASE WHEN sp.status = 'DRAFT' THEN sp.id::text END),
                NULL,
              ),
              ARRAY[]::text[],
            ) AS "attachedDraftPaymentRequestIds",
            COALESCE(
              array_remove(
                array_agg(DISTINCT CASE WHEN sp.status <> 'DRAFT' THEN sp.id::text END),
                NULL,
              ),
              ARRAY[]::text[],
            ) AS "attachedNonDraftPaymentRequestIds"
          FROM scoped_payments sp
          JOIN payment_request_attachment pra
            ON pra.payment_request_id = sp.id
           AND pra.deleted_at IS NULL
          JOIN resource r
            ON r.id = pra.resource_id
           AND r.deleted_at IS NULL
          GROUP BY r.id, r.original_name, r.size, r.created_at, r.mimetype
        )
        SELECT
          cd.id,
          cd.name,
          cd.size,
          cd.created_at AS "createdAt",
          cd.mimetype,
          cd.kind,
          COALESCE(rt.tags, ARRAY[]::text[]) AS tags,
          cd."attachedDraftPaymentRequestIds",
          cd."attachedNonDraftPaymentRequestIds",
          COUNT(*) OVER()::int AS "totalCount"
        FROM contract_docs cd
        LEFT JOIN resource_tags rt ON rt.resource_id = cd.id
        ORDER BY cd.created_at DESC, cd.id DESC
        LIMIT ${safePageSize}
        OFFSET ${offset}
      `);

      if (rows.length === 0 && safePage > 1) {
        const countRows = await this.prisma.$queryRaw<Array<{ totalCount: number | bigint }>>(Prisma.sql`
          WITH scoped_payments AS (
            SELECT pr.id
            FROM payment_request pr
            LEFT JOIN consumer requester ON requester.id = pr.requester_id
            LEFT JOIN consumer payer ON payer.id = pr.payer_id
            WHERE pr.deleted_at IS NULL
              AND ${participantSql}
              AND (
                LOWER(COALESCE(requester.email, pr.requester_email, '')) = LOWER(${contractEmail})
                OR LOWER(COALESCE(payer.email, pr.payer_email, '')) = LOWER(${contractEmail})
              )
          ),
          contract_docs AS (
            SELECT r.id
            FROM scoped_payments sp
            JOIN payment_request_attachment pra
              ON pra.payment_request_id = sp.id
             AND pra.deleted_at IS NULL
            JOIN resource r
              ON r.id = pra.resource_id
             AND r.deleted_at IS NULL
            GROUP BY r.id
          )
          SELECT COUNT(*)::int AS "totalCount"
          FROM contract_docs
        `);

        return {
          items: [],
          total: countRows.length > 0 ? Number(countRows[0].totalCount) : 0,
          page: safePage,
          pageSize: safePageSize,
        };
      }

      const formatted = this.formatDocumentRows(rows, backendBaseUrl);
      return { ...formatted, page: safePage, pageSize: safePageSize };
    }

    const kindFilterSql = kindFilter ? Prisma.sql`WHERE doc.kind = ${kindFilter}` : Prisma.empty;
    const rows = await this.prisma.$queryRaw<DocumentListRow[]>(Prisma.sql`
      WITH scoped_payments AS (
        SELECT
          pr.id,
          pr.status
        FROM payment_request pr
        WHERE pr.deleted_at IS NULL
          AND ${participantSql}
      ),
      attachment_docs AS (
        SELECT
          r.id,
          r.original_name,
          r.size,
          COALESCE(r.created_at, MAX(pra.created_at)) AS created_at,
          r.mimetype,
          COALESCE(
            array_remove(
              array_agg(DISTINCT CASE WHEN sp.status = 'DRAFT' THEN sp.id::text END),
              NULL,
            ),
            ARRAY[]::text[],
          ) AS "attachedDraftPaymentRequestIds",
          COALESCE(
            array_remove(
              array_agg(DISTINCT CASE WHEN sp.status <> 'DRAFT' THEN sp.id::text END),
              NULL,
            ),
            ARRAY[]::text[],
          ) AS "attachedNonDraftPaymentRequestIds"
        FROM scoped_payments sp
        JOIN payment_request_attachment pra
          ON pra.payment_request_id = sp.id
         AND pra.deleted_at IS NULL
        JOIN resource r
          ON r.id = pra.resource_id
         AND r.deleted_at IS NULL
        GROUP BY r.id, r.original_name, r.size, r.created_at, r.mimetype
      ),
      consumer_docs AS (
        SELECT
          r.id,
          r.original_name,
          r.size,
          COALESCE(r.created_at, MAX(cr.created_at)) AS created_at,
          r.mimetype
        FROM consumer_resource cr
        JOIN resource r
          ON r.id = cr.resource_id
         AND r.deleted_at IS NULL
        WHERE cr.consumer_id::text = ${consumerId}
          AND cr.deleted_at IS NULL
        GROUP BY r.id, r.original_name, r.size, r.created_at, r.mimetype
      ),
      resource_tags AS (
        SELECT
          rt.resource_id,
          COALESCE(array_agg(DISTINCT dt.name ORDER BY dt.name), ARRAY[]::text[]) AS tags
        FROM resource_tag rt
        JOIN document_tag dt ON dt.id = rt.tag_id
        GROUP BY rt.resource_id
      ),
      combined_docs AS (
        SELECT
          COALESCE(cd.id, ad.id) AS id,
          COALESCE(cd.original_name, ad.original_name) AS name,
          COALESCE(cd.size, ad.size) AS size,
          COALESCE(cd.created_at, ad.created_at) AS created_at,
          COALESCE(cd.mimetype, ad.mimetype) AS mimetype,
          CASE
            WHEN cd.id IS NOT NULL THEN ${this.buildDocumentKindSql(Prisma.sql`cd.original_name`)}
            ELSE 'PAYMENT'
          END AS kind,
          COALESCE(rt.tags, ARRAY[]::text[]) AS tags,
          COALESCE(ad."attachedDraftPaymentRequestIds", ARRAY[]::text[]) AS "attachedDraftPaymentRequestIds",
          COALESCE(ad."attachedNonDraftPaymentRequestIds", ARRAY[]::text[]) AS "attachedNonDraftPaymentRequestIds"
        FROM consumer_docs cd
        FULL OUTER JOIN attachment_docs ad ON ad.id = cd.id
        LEFT JOIN resource_tags rt ON rt.resource_id = COALESCE(cd.id, ad.id)
      ),
      filtered_docs AS (
        SELECT *
        FROM combined_docs doc
        ${kindFilterSql}
      )
      SELECT
        doc.id,
        doc.name,
        doc.size,
        doc.created_at AS "createdAt",
        doc.mimetype,
        doc.kind,
        doc.tags,
        doc."attachedDraftPaymentRequestIds",
        doc."attachedNonDraftPaymentRequestIds",
        COUNT(*) OVER()::int AS "totalCount"
      FROM filtered_docs doc
      ORDER BY doc.created_at DESC, doc.id DESC
      LIMIT ${safePageSize}
      OFFSET ${offset}
    `);

    if (rows.length === 0 && safePage > 1) {
      const countRows = await this.prisma.$queryRaw<Array<{ totalCount: number | bigint }>>(Prisma.sql`
        WITH scoped_payments AS (
          SELECT pr.id, pr.status
          FROM payment_request pr
          WHERE pr.deleted_at IS NULL
            AND ${participantSql}
        ),
        attachment_docs AS (
          SELECT
            r.id,
            r.original_name
          FROM scoped_payments sp
          JOIN payment_request_attachment pra
            ON pra.payment_request_id = sp.id
           AND pra.deleted_at IS NULL
          JOIN resource r
            ON r.id = pra.resource_id
           AND r.deleted_at IS NULL
          GROUP BY r.id, r.original_name
        ),
        consumer_docs AS (
          SELECT
            r.id,
            r.original_name
          FROM consumer_resource cr
          JOIN resource r
            ON r.id = cr.resource_id
           AND r.deleted_at IS NULL
          WHERE cr.consumer_id::text = ${consumerId}
            AND cr.deleted_at IS NULL
          GROUP BY r.id, r.original_name
        ),
        combined_docs AS (
          SELECT
            COALESCE(cd.id, ad.id) AS id,
            CASE
              WHEN cd.id IS NOT NULL THEN ${this.buildDocumentKindSql(Prisma.sql`cd.original_name`)}
              ELSE 'PAYMENT'
            END AS kind
          FROM consumer_docs cd
          FULL OUTER JOIN attachment_docs ad ON ad.id = cd.id
        )
        SELECT COUNT(*)::int AS "totalCount"
        FROM combined_docs doc
        ${kindFilterSql}
      `);

      return {
        items: [],
        total: countRows.length > 0 ? Number(countRows[0].totalCount) : 0,
        page: safePage,
        pageSize: safePageSize,
      };
    }

    const formatted = this.formatDocumentRows(rows, backendBaseUrl);
    return { ...formatted, page: safePage, pageSize: safePageSize };
  }

  private async getDocumentsInMemory(
    consumerId: string,
    consumerEmail: string | null,
    safePage: number,
    safePageSize: number,
    backendBaseUrl: string | undefined,
    kindFilter: string | null,
    contractContact: { id: string; email: string } | null,
  ): Promise<{ items: DocumentListItem[]; total: number; page: number; pageSize: number }> {
    const consumerResources = contractContact
      ? []
      : await this.prisma.consumerResourceModel.findMany({
          where: {
            consumerId,
            deletedAt: null,
            resource: {
              deletedAt: null,
            },
          },
          include: {
            resource: {
              include: {
                resourceTags: {
                  include: { tag: true },
                },
              },
            },
          },
          orderBy: { createdAt: `desc` },
        });

    const paymentRequestAttachments = await this.prisma.paymentRequestAttachmentModel.findMany({
      where: {
        deletedAt: null,
        resource: {
          deletedAt: null,
        },
        ...(contractContact
          ? {
              paymentRequest: this.buildContractRelationshipWhere(consumerId, consumerEmail, contractContact.email),
            }
          : {
              paymentRequest: {
                deletedAt: null,
                OR: this.buildPaymentParticipantWhere(consumerId, consumerEmail),
              },
            }),
      },
      include: {
        resource: {
          include: {
            resourceTags: {
              include: { tag: true },
            },
          },
        },
        paymentRequest: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: `desc` },
    });

    const draftAttachmentIdsByResource = new Map<string, Set<string>>();
    const nonDraftAttachmentIdsByResource = new Map<string, Set<string>>();
    for (const attachment of paymentRequestAttachments) {
      const attachmentIdsByResource =
        attachment.paymentRequest.status === $Enums.TransactionStatus.DRAFT
          ? draftAttachmentIdsByResource
          : nonDraftAttachmentIdsByResource;
      const existingIds = attachmentIdsByResource.get(attachment.resource.id) ?? new Set<string>();
      existingIds.add(attachment.paymentRequest.id);
      attachmentIdsByResource.set(attachment.resource.id, existingIds);
    }

    const all = [
      ...consumerResources.map((cr) => ({
        resourceId: cr.resource.id,
        name: cr.resource.originalName,
        size: cr.resource.size,
        createdAt: cr.resource.createdAt ?? cr.createdAt,
        mimetype: cr.resource.mimetype,
        kind: this.detectKind(cr.resource.originalName),
        tags: cr.resource.resourceTags.map((rt) => rt.tag.name),
        attachedDraftPaymentRequestIds: Array.from(draftAttachmentIdsByResource.get(cr.resource.id) ?? []),
        attachedNonDraftPaymentRequestIds: Array.from(nonDraftAttachmentIdsByResource.get(cr.resource.id) ?? []),
      })),
      ...paymentRequestAttachments.map((pa) => ({
        resourceId: pa.resource.id,
        name: pa.resource.originalName,
        size: pa.resource.size,
        createdAt: pa.resource.createdAt ?? pa.createdAt,
        mimetype: pa.resource.mimetype,
        kind: `PAYMENT`,
        tags: pa.resource.resourceTags.map((rt) => rt.tag.name),
        attachedDraftPaymentRequestIds: Array.from(draftAttachmentIdsByResource.get(pa.resource.id) ?? []),
        attachedNonDraftPaymentRequestIds: Array.from(nonDraftAttachmentIdsByResource.get(pa.resource.id) ?? []),
      })),
    ];

    const byResource = new Map<string, (typeof all)[number]>();
    for (const doc of all) {
      const existing = byResource.get(doc.resourceId);
      const mergedDraftPaymentRequestIds = Array.from(
        new Set([...(existing?.attachedDraftPaymentRequestIds ?? []), ...doc.attachedDraftPaymentRequestIds]),
      );
      const mergedNonDraftPaymentRequestIds = Array.from(
        new Set([...(existing?.attachedNonDraftPaymentRequestIds ?? []), ...doc.attachedNonDraftPaymentRequestIds]),
      );

      if (!existing || doc.createdAt > existing.createdAt) {
        byResource.set(doc.resourceId, {
          ...doc,
          attachedDraftPaymentRequestIds: mergedDraftPaymentRequestIds,
          attachedNonDraftPaymentRequestIds: mergedNonDraftPaymentRequestIds,
        });
        continue;
      }

      byResource.set(doc.resourceId, {
        ...existing,
        attachedDraftPaymentRequestIds: mergedDraftPaymentRequestIds,
        attachedNonDraftPaymentRequestIds: mergedNonDraftPaymentRequestIds,
      });
    }

    let result = Array.from(byResource.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((doc) => ({
        id: doc.resourceId,
        name: doc.name,
        size: doc.size,
        createdAt: doc.createdAt.toISOString(),
        downloadUrl: buildConsumerDocumentDownloadUrl(doc.resourceId, backendBaseUrl),
        mimetype: doc.mimetype,
        kind: doc.kind,
        tags: doc.tags,
        isAttachedToDraftPaymentRequest: doc.attachedDraftPaymentRequestIds.length > 0,
        attachedDraftPaymentRequestIds: doc.attachedDraftPaymentRequestIds,
        isAttachedToNonDraftPaymentRequest: doc.attachedNonDraftPaymentRequestIds.length > 0,
        attachedNonDraftPaymentRequestIds: doc.attachedNonDraftPaymentRequestIds,
      }));

    if (kindFilter) {
      result = result.filter((document) => document.kind === kindFilter);
    }

    const total = result.length;
    const start = (safePage - 1) * safePageSize;
    const items = result.slice(start, start + safePageSize);
    return { items, total, page: safePage, pageSize: safePageSize };
  }

  async getDocuments(
    consumerId: string,
    kind?: string,
    page = 1,
    pageSize = 10,
    backendBaseUrl?: string,
    contactId?: string,
  ): Promise<{
    items: DocumentListItem[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const safePage = Math.max(1, Math.floor(Number(page)) || 1);
    const safePageSize = Math.min(100, Math.max(1, Math.floor(Number(pageSize)) || 10));
    const kindFilter = kind?.trim().toUpperCase() || null;
    const normalizedContactId = contactId?.trim();
    const consumerEmail = await this.getConsumerEmail(consumerId);
    const contractContact = normalizedContactId
      ? await this.prisma.contactModel.findFirst({
          where: {
            id: normalizedContactId,
            consumerId,
            deletedAt: null,
          },
          select: {
            id: true,
            email: true,
          },
        })
      : null;

    if (normalizedContactId && !contractContact) {
      throw new NotFoundException(errorCodes.CONTACT_NOT_FOUND);
    }

    if (typeof this.prisma.$queryRaw === `function`) {
      return this.getDocumentsRaw({
        consumerId,
        consumerEmail,
        safePage,
        safePageSize,
        kindFilter,
        backendBaseUrl,
        contractEmail: contractContact?.email,
      });
    }

    return this.getDocumentsInMemory(
      consumerId,
      consumerEmail,
      safePage,
      safePageSize,
      backendBaseUrl,
      kindFilter,
      contractContact,
    );
  }

  private detectKind(filename: string): string {
    const lower = filename.toLowerCase();
    if (lower.includes(`w9`) || lower.includes(`w-9`)) return `COMPLIANCE`;
    if (lower.includes(`contract`)) return `CONTRACT`;
    if (lower.includes(`invoice`)) return `PAYMENT`;
    return `GENERAL`;
  }

  async uploadDocuments(
    consumerId: string,
    files: Express.Multer.File[],
    backendBaseUrl?: string,
    paymentRequestId?: string,
  ) {
    const created: string[] = [];
    const targetPaymentRequest = paymentRequestId
      ? await this.assertDraftOwnedPaymentRequest(consumerId, paymentRequestId)
      : null;

    for (const file of files) {
      const originalName = Buffer.from(file.originalname, `latin1`).toString(`utf8`);

      const stored = await this.storage.upload(
        {
          buffer: file.buffer,
          originalName: originalName,
          mimetype: file.mimetype,
        },
        backendBaseUrl,
      );

      const resource = await this.prisma.resourceModel.create({
        data: {
          access: $Enums.ResourceAccess.PRIVATE,
          originalName: originalName,
          mimetype: file.mimetype,
          size: file.size,
          bucket: stored.bucket,
          key: stored.key,
          downloadUrl: stored.downloadUrl,
        },
      });

      await this.prisma.consumerResourceModel.create({
        data: {
          consumerId,
          resourceId: resource.id,
        },
      });

      if (targetPaymentRequest) {
        await this.prisma.paymentRequestAttachmentModel.create({
          data: {
            paymentRequestId: targetPaymentRequest.id,
            requesterId: consumerId,
            resourceId: resource.id,
          },
        });
      }

      created.push(resource.id);
    }

    return { ids: created };
  }

  async openDownload(consumerId: string, resourceId: string) {
    const consumerEmail = await this.getConsumerEmail(consumerId);
    const resource = await this.prisma.resourceModel.findFirst({
      where: {
        id: resourceId,
        deletedAt: null,
        OR: [
          {
            consumerResources: {
              some: {
                consumerId,
                deletedAt: null,
              },
            },
          },
          {
            AND: [
              {
                resourceTags: {
                  none: {
                    tag: { name: { startsWith: `INVOICE-` } },
                  },
                },
              },
              {
                attachments: {
                  some: {
                    deletedAt: null,
                    paymentRequest: {
                      deletedAt: null,
                      OR: this.buildPaymentParticipantWhere(consumerId, consumerEmail),
                    },
                  },
                },
              },
            ],
          },
          {
            AND: [
              {
                resourceTags: {
                  some: {
                    tag: { name: { startsWith: `INVOICE-` } },
                  },
                },
              },
              {
                attachments: {
                  some: {
                    deletedAt: null,
                    requesterId: consumerId,
                    paymentRequest: {
                      deletedAt: null,
                    },
                  },
                },
              },
            ],
          },
        ],
      },
      select: {
        bucket: true,
        key: true,
        originalName: true,
        mimetype: true,
      },
    });

    if (!resource) {
      throw new ForbiddenException(errorCodes.DOCUMENT_ACCESS_DENIED);
    }

    return this.storage.openDownloadStream(resource);
  }

  async bulkDeleteDocuments(consumerId: string, ids: string[]) {
    const normalizedIds = Array.from(new Set((Array.isArray(ids) ? ids : []).map((id) => id?.trim()).filter(Boolean)));
    if (normalizedIds.length === 0) {
      return { success: true };
    }

    const ownedResources = await this.prisma.consumerResourceModel.findMany({
      where: {
        consumerId,
        resourceId: { in: normalizedIds },
      },
      select: { resourceId: true },
    });
    const ownedResourceIds = ownedResources.map((resource) => resource.resourceId);

    if (ownedResourceIds.length !== normalizedIds.length) {
      throw new ForbiddenException(errorCodes.DOCUMENT_ACCESS_DENIED);
    }

    const paymentAttachments = await this.prisma.paymentRequestAttachmentModel.findMany({
      where: {
        resourceId: { in: ownedResourceIds },
      },
      select: {
        resourceId: true,
        paymentRequest: {
          select: {
            status: true,
          },
        },
      },
    });

    const nonDraftBlockedResourceIds = new Set(
      paymentAttachments
        .filter((attachment) => attachment.paymentRequest.status !== $Enums.TransactionStatus.DRAFT)
        .map((attachment) => attachment.resourceId),
    );
    if (nonDraftBlockedResourceIds.size > 0) {
      throw new BadRequestException(
        nonDraftBlockedResourceIds.size === 1
          ? SINGLE_NON_DRAFT_ATTACHMENT_DELETE_BLOCK_MESSAGE
          : MULTI_NON_DRAFT_ATTACHMENT_DELETE_BLOCK_MESSAGE,
      );
    }

    const draftBlockedResourceIds = new Set(
      paymentAttachments
        .filter((attachment) => attachment.paymentRequest.status === $Enums.TransactionStatus.DRAFT)
        .map((attachment) => attachment.resourceId),
    );
    if (draftBlockedResourceIds.size > 0) {
      throw new BadRequestException(
        draftBlockedResourceIds.size === 1
          ? SINGLE_DRAFT_ATTACHMENT_DELETE_BLOCK_MESSAGE
          : MULTI_DRAFT_ATTACHMENT_DELETE_BLOCK_MESSAGE,
      );
    }

    await this.prisma.consumerResourceModel.deleteMany({
      where: {
        consumerId,
        resourceId: { in: ownedResourceIds },
      },
    });

    await this.prisma.resourceTagModel.deleteMany({
      where: {
        resourceId: { in: ownedResourceIds },
      },
    });

    return { success: true };
  }

  async deleteDocument(consumerId: string, id: string) {
    return this.bulkDeleteDocuments(consumerId, [id]);
  }

  private async getAccessibleAttachmentResources(
    consumerId: string,
    resourceIds: string[],
    consumerEmail: string | null,
  ) {
    return this.prisma.paymentRequestAttachmentModel.findMany({
      where: {
        deletedAt: null,
        resource: {
          deletedAt: null,
        },
        resourceId: { in: resourceIds },
        paymentRequest: {
          deletedAt: null,
          OR: this.buildPaymentParticipantWhere(consumerId, consumerEmail),
        },
      },
      select: { resourceId: true },
    });
  }

  async attachToPayment(consumerId: string, paymentRequestId: string, resourceIds: string[]) {
    const ids = Array.from(
      new Set((Array.isArray(resourceIds) ? resourceIds : []).map((id) => id?.trim()).filter(Boolean)),
    );
    if (ids.length === 0) {
      return { success: true };
    }

    await this.assertDraftOwnedPaymentRequest(consumerId, paymentRequestId);
    const consumerEmail = await this.getConsumerEmail(consumerId);

    const [ownedResources, accessibleAttachments] = await Promise.all([
      this.prisma.consumerResourceModel.findMany({
        where: {
          consumerId,
          resourceId: { in: ids },
          deletedAt: null,
          resource: {
            deletedAt: null,
          },
        },
        select: { resourceId: true },
      }),
      this.getAccessibleAttachmentResources(consumerId, ids, consumerEmail),
    ]);

    const accessibleResourceIds = new Set([
      ...ownedResources.map((resource) => resource.resourceId),
      ...accessibleAttachments.map((attachment) => attachment.resourceId),
    ]);

    if (ids.some((resourceId) => !accessibleResourceIds.has(resourceId))) {
      throw new ForbiddenException(errorCodes.DOCUMENT_ACCESS_DENIED);
    }

    const paymentRequestAttachments = await this.prisma.paymentRequestAttachmentModel.findMany({
      where: {
        paymentRequestId,
        resourceId: { in: ids },
        deletedAt: null,
      },
      select: { resourceId: true },
    });

    const existingAttachmentResourceIds = new Set(paymentRequestAttachments.map((attachment) => attachment.resourceId));

    const toCreate = ids.filter((resourceId) => !existingAttachmentResourceIds.has(resourceId));

    await this.prisma.paymentRequestAttachmentModel.createMany({
      data: toCreate.map((resourceId) => ({
        paymentRequestId,
        requesterId: consumerId,
        resourceId,
      })),
      skipDuplicates: true,
    });

    return { success: true };
  }

  async detachFromPayment(consumerId: string, paymentRequestId: string, resourceId: string) {
    const normalizedResourceId = resourceId.trim();
    if (!normalizedResourceId) {
      throw new BadRequestException(`Resource id is required`);
    }

    const paymentRequest = await this.assertDraftOwnedPaymentRequest(consumerId, paymentRequestId);

    await this.prisma.paymentRequestAttachmentModel.deleteMany({
      where: {
        paymentRequestId: paymentRequest.id,
        requesterId: consumerId,
        resourceId: normalizedResourceId,
      },
    });

    return { success: true };
  }

  async setTags(consumerId: string, resourceId: string, tags: string[]) {
    const consumerEmail = await this.getConsumerEmail(consumerId);
    const [consumerResource, accessibleAttachment] = await Promise.all([
      this.prisma.consumerResourceModel.findFirst({
        where: {
          consumerId,
          resourceId,
          deletedAt: null,
          resource: {
            deletedAt: null,
          },
        },
      }),
      this.prisma.paymentRequestAttachmentModel.findFirst({
        where: {
          deletedAt: null,
          resource: {
            deletedAt: null,
          },
          resourceId,
          paymentRequest: {
            deletedAt: null,
            OR: this.buildPaymentParticipantWhere(consumerId, consumerEmail),
          },
        },
        select: { resourceId: true },
      }),
    ]);

    if (!consumerResource && !accessibleAttachment) {
      throw new ForbiddenException(errorCodes.DOCUMENT_ACCESS_DENIED);
    }

    // normalize tags
    const cleaned = tags
      .map((tag) => tag.trim())
      .filter(Boolean)
      .map((tag) => tag.toLowerCase());

    // upsert tag records
    const documentTags = [];
    for (const name of cleaned) {
      const documentTag = await this.prisma.documentTagModel.upsert({
        where: { name },
        update: {},
        create: { name },
      });
      documentTags.push(documentTag);
    }

    // remove old links
    await this.prisma.resourceTagModel.deleteMany({
      where: { resourceId },
    });

    // add current links
    await this.prisma.resourceTagModel.createMany({
      data: documentTags.map((documentTag) => ({
        resourceId,
        tagId: documentTag.id,
      })),
    });

    return { success: true };
  }
}
