import { describe, expect, it, jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { AdminV2VerificationCaseService } from './admin-v2-verification-case.service';
import { AdminV2VerificationDecisionService } from './admin-v2-verification-decision.service';
import { AdminV2VerificationQueueService } from './admin-v2-verification-queue.service';
import { AdminV2VerificationService } from './admin-v2-verification.service';
import { ADMIN_ACTION_AUDIT_ACTIONS } from '../../shared/admin-action-audit.service';

function buildQueueRow(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    email: `${id}@example.com`,
    accountType: `PERSONAL`,
    contractorKind: null,
    verificationStatus: `PENDING`,
    stripeIdentityStatus: null,
    createdAt: new Date(`2026-04-15T08:00:00.000Z`),
    updatedAt: new Date(`2026-04-15T08:00:00.000Z`),
    verificationUpdatedAt: new Date(`2026-04-15T08:00:00.000Z`),
    personalDetails: { firstName: `One`, lastName: `User` },
    organizationDetails: null,
    addressDetails: { country: `DE` },
    _count: { consumerResources: 1 },
    ...overrides,
  };
}

function buildService() {
  const query = {
    getQueueRows: jest.fn<(...a: any[]) => any>(),
    getQueueCountRows: jest.fn<(...a: any[]) => any>(),
    countQueue: jest.fn<(...a: any[]) => any>(),
    getDecisionHistory: jest.fn<(...a: any[]) => any>(),
    getAuthRiskContext: jest.fn<(...a: any[]) => any>(),
  };
  const repository = {
    applyDecision: jest.fn<(...a: any[]) => any>(),
    updateAuditNotificationStatus: jest.fn<(...a: any[]) => any>(),
  };
  const consumersService = {
    getConsumerCase: jest.fn<(...a: any[]) => any>(),
  };
  const slaService = {
    getSnapshot: jest.fn<(...a: any[]) => any>(),
    refreshBreaches: jest.fn<(...a: any[]) => any>(),
  };
  const idempotency = {
    execute: jest.fn<(...a: any[]) => any>(async ({ execute }: { execute: () => Promise<unknown> }) => execute()),
  };
  const mailingService = {
    sendAdminV2VerificationDecisionEmail: jest.fn<(...a: any[]) => any>(),
  };
  const assignmentsService = {
    getAssignmentContextForResource: jest.fn<(...a: any[]) => any>(),
    getActiveAssigneesForResource: jest.fn<(...a: any[]) => any>(),
  };

  const queueService = new AdminV2VerificationQueueService(
    query as never,
    slaService as never,
    assignmentsService as never,
  );
  const caseService = new AdminV2VerificationCaseService(
    consumersService as never,
    query as never,
    slaService as never,
    assignmentsService as never,
  );
  const decisionService = new AdminV2VerificationDecisionService(
    repository as never,
    slaService as never,
    idempotency as never,
    mailingService as never,
  );

  return {
    service: new AdminV2VerificationService(queueService, caseService, decisionService),
    query,
    repository,
    consumersService,
    slaService,
    idempotency,
    mailingService,
    assignmentsService,
  };
}

describe(`AdminV2VerificationService`, () => {
  it(`reports SLA breaches at queue level instead of current page only`, async () => {
    const { service, query, slaService, assignmentsService } = buildService();
    query.getQueueRows.mockResolvedValueOnce([buildQueueRow(`consumer-1`), buildQueueRow(`consumer-2`)]);
    slaService.getSnapshot.mockResolvedValueOnce({
      breachedConsumerIds: new Set<string>([`consumer-1`, `consumer-2`]),
      thresholdHours: 24,
      lastComputedAt: `2026-04-15T10:00:00.000Z`,
    });
    assignmentsService.getActiveAssigneesForResource.mockResolvedValueOnce(new Map());

    const queue = await service.getQueue({ page: 1, pageSize: 1 });

    expect(queue.items).toHaveLength(1);
    expect(queue.items[0]?.id).toBe(`consumer-1`);
    expect(queue.sla.breachedCount).toBe(2);
  });

  it(`decorates queue rows with the active assignee when an assignment exists`, async () => {
    const { service, query, slaService, assignmentsService } = buildService();
    query.getQueueRows.mockResolvedValueOnce([buildQueueRow(`consumer-1`), buildQueueRow(`consumer-2`)]);
    slaService.getSnapshot.mockResolvedValueOnce({
      breachedConsumerIds: new Set<string>(),
      thresholdHours: 24,
      lastComputedAt: `2026-04-15T10:00:00.000Z`,
    });
    assignmentsService.getActiveAssigneesForResource.mockResolvedValueOnce(
      new Map([[`consumer-1`, { id: `admin-7`, name: null, email: `ops7@example.com` }]]),
    );

    const queue = await service.getQueue({ page: 1, pageSize: 10 });

    expect(assignmentsService.getActiveAssigneesForResource).toHaveBeenCalledWith(`verification`, [
      `consumer-1`,
      `consumer-2`,
    ]);
    expect(queue.items.find((item) => item.id === `consumer-1`)?.assignedTo).toEqual({
      id: `admin-7`,
      name: null,
      email: `ops7@example.com`,
    });
    expect(queue.items.find((item) => item.id === `consumer-2`)?.assignedTo).toBeNull();
  });

  it(`exposes current and historical assignment context on getCase`, async () => {
    const { service, query, consumersService, slaService, assignmentsService } = buildService();
    const assignmentContext = {
      current: {
        id: `assignment-2`,
        assignedTo: { id: `admin-7`, name: null, email: `ops7@example.com` },
        assignedBy: { id: `admin-7`, name: null, email: `ops7@example.com` },
        assignedAt: `2026-04-20T12:00:00.000Z`,
        reason: `Ops follow-up`,
        expiresAt: null,
      },
      history: [
        {
          id: `assignment-2`,
          assignedTo: { id: `admin-7`, name: null, email: `ops7@example.com` },
          assignedBy: { id: `admin-7`, name: null, email: `ops7@example.com` },
          assignedAt: `2026-04-20T12:00:00.000Z`,
          releasedAt: null,
          releasedBy: null,
          reason: `Ops follow-up`,
          expiresAt: null,
        },
      ],
    };
    consumersService.getConsumerCase.mockResolvedValueOnce({
      id: `consumer-1`,
      email: `user@example.com`,
      updatedAt: new Date(`2026-04-20T12:00:00.000Z`),
      verificationStatus: `PENDING`,
    });
    query.getDecisionHistory.mockResolvedValueOnce([]);
    query.getAuthRiskContext.mockResolvedValueOnce({
      loginFailures24h: 0,
      refreshReuse30d: 0,
      recentEvents: [],
    });
    slaService.getSnapshot.mockResolvedValueOnce({
      breachedConsumerIds: new Set<string>(),
      thresholdHours: 24,
      lastComputedAt: `2026-04-20T12:00:00.000Z`,
    });
    assignmentsService.getAssignmentContextForResource.mockResolvedValueOnce(assignmentContext);

    const result = await service.getCase(`consumer-1`, {
      canForceLogout: false,
      canDecide: false,
      allowedActions: [],
      canManageAssignments: true,
      canReassignAssignments: false,
    });

    expect(assignmentsService.getAssignmentContextForResource).toHaveBeenCalledWith(`verification`, `consumer-1`);
    expect(result.assignment).toEqual(assignmentContext);
    expect(result.decisionControls.canManageAssignments).toBe(true);
  });

  it(`throws not found from getCase when auth-risk context cannot resolve the consumer`, async () => {
    const { service, query, consumersService, slaService, assignmentsService } = buildService();
    consumersService.getConsumerCase.mockResolvedValueOnce({
      id: `consumer-1`,
      email: `user@example.com`,
      updatedAt: new Date(`2026-04-20T12:00:00.000Z`),
      verificationStatus: `PENDING`,
    });
    query.getDecisionHistory.mockResolvedValueOnce([]);
    query.getAuthRiskContext.mockResolvedValueOnce(null);
    slaService.getSnapshot.mockResolvedValueOnce({
      breachedConsumerIds: new Set<string>(),
      thresholdHours: 24,
      lastComputedAt: `2026-04-20T12:00:00.000Z`,
    });
    assignmentsService.getAssignmentContextForResource.mockResolvedValueOnce({ current: null, history: [] });

    await expect(
      service.getCase(`consumer-1`, {
        canForceLogout: false,
        canDecide: false,
        allowedActions: [],
        canManageAssignments: false,
        canReassignAssignments: false,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it(`delegates plain queue count to the query collaborator`, async () => {
    const { service, query } = buildService();
    query.countQueue.mockResolvedValueOnce(99);

    await expect(service.getQueueCount({ status: `PENDING` })).resolves.toBe(99);
    expect(query.countQueue).toHaveBeenCalledTimes(1);
  });

  it(`uses materialized rows when missing-profile or missing-documents filtering is requested`, async () => {
    const { service, query } = buildService();
    query.getQueueCountRows
      .mockResolvedValueOnce([
        buildQueueRow(`consumer-1`, { _count: { consumerResources: 0 } }),
        buildQueueRow(`consumer-2`, { personalDetails: { firstName: null, lastName: `User` } }),
        buildQueueRow(`consumer-3`),
      ])
      .mockResolvedValueOnce([
        buildQueueRow(`consumer-1`, { _count: { consumerResources: 0 } }),
        buildQueueRow(`consumer-2`, { personalDetails: { firstName: null, lastName: `User` } }),
        buildQueueRow(`consumer-3`),
      ]);

    await expect(service.getQueueCount({ missingProfileData: true })).resolves.toBe(1);
    await expect(service.getQueueCount({ missingDocuments: true })).resolves.toBe(1);
    expect(query.getQueueCountRows).toHaveBeenCalledTimes(2);
  });

  it(`sends consumer-visible email side effects for approve and persists notification metadata`, async () => {
    const { service, repository, mailingService, slaService } = buildService();
    repository.applyDecision.mockResolvedValueOnce({
      consumerEmail: `user@example.com`,
      auditEntryId: `audit-1`,
      auditMetadata: {
        fromStatus: `PENDING`,
        toStatus: `APPROVED`,
        reason: null,
        expectedVersion: new Date(`2026-04-15T10:00:00.000Z`).getTime(),
        notificationType: `email`,
        notificationSent: false,
      },
      updatedConsumer: {
        id: `consumer-1`,
        verificationStatus: `APPROVED`,
        verificationReason: null,
        verificationUpdatedAt: new Date(`2026-04-15T10:05:00.000Z`),
        updatedAt: new Date(`2026-04-15T10:05:00.000Z`),
      },
    });
    mailingService.sendAdminV2VerificationDecisionEmail.mockResolvedValueOnce(true);
    repository.updateAuditNotificationStatus.mockResolvedValueOnce(undefined);
    slaService.refreshBreaches.mockResolvedValueOnce(undefined);

    const result = await service.applyDecision(
      `consumer-1`,
      `admin-1`,
      `approve`,
      { confirmed: true, version: new Date(`2026-04-15T10:00:00.000Z`).getTime() },
      { ipAddress: `127.0.0.1`, userAgent: `jest`, idempotencyKey: `idem-1` },
    );

    expect(mailingService.sendAdminV2VerificationDecisionEmail).toHaveBeenCalledWith({
      email: `user@example.com`,
      decision: `approve`,
      reason: null,
    });
    expect(repository.updateAuditNotificationStatus).toHaveBeenCalledWith(
      `audit-1`,
      expect.objectContaining({
        notificationType: `email`,
        notificationSent: true,
      }),
    );
    expect(repository.applyDecision).toHaveBeenCalledWith(
      expect.objectContaining({
        actionName: ADMIN_ACTION_AUDIT_ACTIONS.verification_approve,
        notificationType: `email`,
        nextState: {
          verificationStatus: $Enums.VerificationStatus.APPROVED,
          verified: true,
          legalVerified: true,
        },
      }),
    );
    expect(slaService.refreshBreaches).toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        verificationStatus: `APPROVED`,
        verificationUpdatedAt: `2026-04-15T10:05:00.000Z`,
        updatedAt: `2026-04-15T10:05:00.000Z`,
        notification: { type: `email`, sent: true },
      }),
    );
  });

  it(`applies flag decisions without sending consumer-visible email`, async () => {
    const { service, repository, mailingService, slaService } = buildService();
    repository.applyDecision.mockResolvedValueOnce({
      consumerEmail: `user@example.com`,
      auditEntryId: `audit-flag-1`,
      auditMetadata: {
        fromStatus: `PENDING`,
        toStatus: `FLAGGED`,
        reason: `Manual review`,
        expectedVersion: new Date(`2026-04-15T10:00:00.000Z`).getTime(),
      },
      updatedConsumer: {
        id: `consumer-1`,
        verificationStatus: `FLAGGED`,
        verificationReason: `Manual review`,
        verificationUpdatedAt: new Date(`2026-04-15T10:05:00.000Z`),
        updatedAt: new Date(`2026-04-15T10:05:00.000Z`),
      },
    });
    slaService.refreshBreaches.mockResolvedValueOnce(undefined);

    const result = await service.applyDecision(
      `consumer-1`,
      `admin-1`,
      `flag`,
      {
        confirmed: true,
        reason: `Manual review`,
        version: new Date(`2026-04-15T10:00:00.000Z`).getTime(),
      },
      { ipAddress: `127.0.0.1`, userAgent: `jest`, idempotencyKey: `idem-flag-1` },
    );

    expect(repository.applyDecision).toHaveBeenCalledWith(
      expect.objectContaining({
        actionName: ADMIN_ACTION_AUDIT_ACTIONS.verification_flag,
        notificationType: null,
        nextState: {
          verificationStatus: $Enums.VerificationStatus.FLAGGED,
          verified: false,
          legalVerified: false,
        },
      }),
    );
    expect(mailingService.sendAdminV2VerificationDecisionEmail).not.toHaveBeenCalled();
    expect(repository.updateAuditNotificationStatus).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.not.objectContaining({
        notification: expect.anything(),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        verificationStatus: `FLAGGED`,
        verificationReason: `Manual review`,
        verificationUpdatedAt: `2026-04-15T10:05:00.000Z`,
        updatedAt: `2026-04-15T10:05:00.000Z`,
      }),
    );
  });

  it(`propagates stale-version conflicts from the repository`, async () => {
    const { service, repository } = buildService();
    repository.applyDecision.mockRejectedValueOnce(
      new ConflictException({
        error: `STALE_VERSION`,
        message: `Resource has been modified by another operator`,
        currentVersion: 123,
        currentUpdatedAt: `2026-04-15T10:05:00.000Z`,
        recommendedAction: `reload`,
      }),
    );

    await expect(
      service.applyDecision(
        `consumer-1`,
        `admin-1`,
        `approve`,
        { confirmed: true, version: new Date(`2026-04-15T10:00:00.000Z`).getTime() },
        { ipAddress: `127.0.0.1`, userAgent: `jest`, idempotencyKey: `idem-1` },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
