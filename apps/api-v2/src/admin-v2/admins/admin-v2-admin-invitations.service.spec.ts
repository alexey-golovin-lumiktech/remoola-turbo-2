import { describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';

import { AdminV2AdminAuditTrail } from './admin-v2-admin-audit-trail';
import { AdminV2AdminInvitationsRepository } from './admin-v2-admin-invitations.repository';
import { AdminV2AdminInvitationsService } from './admin-v2-admin-invitations.service';
import { AdminV2AdminLinks } from './admin-v2-admin-links';
import { PrismaTransactionRunner } from '../../shared/prisma-transaction.runner';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';

describe(`AdminV2AdminInvitationsService`, () => {
  async function buildService() {
    const repository = {
      getAdminByEmail: jest.fn<(...a: any[]) => any>(),
      getRoleByKey: jest.fn<(...a: any[]) => any>(),
      getRoleById: jest.fn<(...a: any[]) => any>(),
      getPendingInvitation: jest.fn<(...a: any[]) => any>(),
      createInvitation: jest.fn<(...a: any[]) => any>(),
      createInvitationAuditEntry: jest.fn<(...a: any[]) => any>(),
      updateInvitationAuditDelivery: jest.fn<(...a: any[]) => any>(),
      getInvitationForAcceptance: jest.fn<(...a: any[]) => any>(),
      consumeInvitation: jest.fn<(...a: any[]) => any>(),
      createAdminFromInvitation: jest.fn<(...a: any[]) => any>(),
    };
    const transactions = {
      run: jest.fn<(...a: any[]) => any>(async (callback: (tx: unknown) => Promise<unknown>) => callback({ tx: true })),
    };
    const idempotency = {
      execute: jest.fn<(...a: any[]) => any>(async ({ execute }: { execute: () => Promise<unknown> }) => execute()),
    };
    const jwtService = {
      signAsync: jest.fn<(...a: any[]) => any>(async () => `invite-token`),
      verify: jest.fn<(...a: any[]) => any>(),
    };
    const links = {
      buildInvitationUrl: jest.fn<(...a: any[]) => any>(
        () => `https://admin.example.com/accept-invite?token=invite-token`,
      ),
    };
    const auditTrail = {
      trySendInvitationEmail: jest.fn<(...a: any[]) => any>(async () => true),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminV2AdminInvitationsService,
        { provide: AdminV2AdminInvitationsRepository, useValue: repository },
        { provide: PrismaTransactionRunner, useValue: transactions },
        { provide: AdminV2IdempotencyService, useValue: idempotency },
        { provide: JwtService, useValue: jwtService },
        { provide: AdminV2AdminLinks, useValue: links },
        { provide: AdminV2AdminAuditTrail, useValue: auditTrail },
      ],
    }).compile();

    return {
      service: moduleRef.get(AdminV2AdminInvitationsService),
      repository,
      transactions,
      jwtService,
      links,
      auditTrail,
    };
  }

  it(`keeps pending invitations idempotent without recreating rows`, async () => {
    const { service, repository, transactions } = await buildService();
    repository.getAdminByEmail.mockResolvedValueOnce(null);
    repository.getRoleByKey.mockResolvedValueOnce({ id: `role-ops`, key: `OPS_ADMIN` });
    repository.getPendingInvitation.mockResolvedValueOnce({
      id: `inv-1`,
      email: `invitee@example.com`,
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(`2026-04-17T08:05:00.000Z`),
    });

    const result = await service.inviteAdmin(
      `admin-1`,
      { email: `invitee@example.com`, roleKey: `OPS_ADMIN` },
      { idempotencyKey: `idem-1` },
    );

    expect(transactions.run).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      invitationId: `inv-1`,
      alreadyPending: true,
      status: `pending`,
    });
  });

  it(`creates invitation state before a failed email send and updates audit delivery status`, async () => {
    const { service, repository, auditTrail, links, transactions } = await buildService();
    repository.getAdminByEmail.mockResolvedValueOnce(null);
    repository.getRoleByKey.mockResolvedValueOnce({ id: `role-support`, key: `SUPPORT_ADMIN` });
    repository.getPendingInvitation.mockResolvedValueOnce(null);
    repository.createInvitation.mockResolvedValueOnce({
      id: `inv-1`,
      email: `invitee@example.com`,
      expiresAt: new Date(`2026-04-24T08:00:00.000Z`),
      createdAt: new Date(`2026-04-17T08:05:00.000Z`),
    });
    repository.createInvitationAuditEntry.mockResolvedValueOnce({ id: `audit-1` });
    auditTrail.trySendInvitationEmail.mockResolvedValueOnce(false);

    const result = await service.inviteAdmin(
      `admin-1`,
      { email: `invitee@example.com`, roleKey: `SUPPORT_ADMIN` },
      { idempotencyKey: `idem-2` },
    );

    expect(transactions.run).toHaveBeenCalled();
    expect(repository.createInvitation).toHaveBeenCalled();
    expect(repository.createInvitationAuditEntry).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        invitationId: `inv-1`,
        email: `invitee@example.com`,
        roleKey: `SUPPORT_ADMIN`,
      }),
    );
    expect(auditTrail.trySendInvitationEmail).toHaveBeenCalledWith({
      email: `invitee@example.com`,
      signupLink: `https://admin.example.com/accept-invite?token=invite-token`,
    });
    expect(links.buildInvitationUrl).toHaveBeenCalledWith(`invite-token`);
    expect(repository.updateInvitationAuditDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        auditId: `audit-1`,
        invitedEmail: `invitee@example.com`,
        roleKey: `SUPPORT_ADMIN`,
        notificationSent: false,
      }),
    );
    expect(result).toMatchObject({
      invitationId: `inv-1`,
      notificationSent: false,
      deliveryStatus: `failed`,
    });
  });

  it(`accepts invitation tokens and delegates admin creation through the transaction runner`, async () => {
    const { service, repository, jwtService, transactions } = await buildService();
    jwtService.verify.mockReturnValueOnce({
      sub: `inv-1`,
      email: `invitee@example.com`,
      roleId: `role-ops`,
      typ: `admin_invitation`,
      scope: `admin_v2`,
    });
    repository.getInvitationForAcceptance.mockResolvedValueOnce({
      id: `inv-1`,
      email: `invitee@example.com`,
      roleId: `role-ops`,
      expiresAt: new Date(Date.now() + 60_000),
      acceptedAt: null,
    });
    repository.getAdminByEmail.mockResolvedValueOnce(null);
    repository.getRoleById.mockResolvedValueOnce({ key: `OPS_ADMIN` });
    repository.consumeInvitation.mockResolvedValueOnce({ count: 1 });
    repository.createAdminFromInvitation.mockResolvedValueOnce({
      id: `admin-2`,
      email: `invitee@example.com`,
    });

    await expect(service.acceptInvitation({ token: `jwt`, password: `VerySecurePass1!` })).resolves.toEqual({
      adminId: `admin-2`,
      email: `invitee@example.com`,
      accepted: true,
    });
    expect(transactions.run).toHaveBeenCalled();
    expect(repository.consumeInvitation).toHaveBeenCalledWith(expect.anything(), `inv-1`);
    expect(repository.createAdminFromInvitation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        email: `invitee@example.com`,
        roleId: `role-ops`,
        type: `ADMIN`,
        hash: expect.any(String),
        salt: expect.any(String),
      }),
    );
  });

  it(`rejects weak passwords when accepting invitations`, async () => {
    const { service } = await buildService();

    await expect(service.acceptInvitation({ token: `jwt`, password: `password` })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it(`surfaces already-accepted races from the transaction runner`, async () => {
    const { service, repository, jwtService } = await buildService();
    jwtService.verify.mockReturnValueOnce({
      sub: `inv-1`,
      email: `invitee@example.com`,
      roleId: `role-ops`,
      typ: `admin_invitation`,
      scope: `admin_v2`,
    });
    repository.getInvitationForAcceptance.mockResolvedValueOnce({
      id: `inv-1`,
      email: `invitee@example.com`,
      roleId: `role-ops`,
      expiresAt: new Date(Date.now() + 60_000),
      acceptedAt: null,
    });
    repository.getAdminByEmail.mockResolvedValueOnce(null);
    repository.getRoleById.mockResolvedValueOnce({ key: `OPS_ADMIN` });
    repository.consumeInvitation.mockResolvedValueOnce({ count: 0 });

    await expect(service.acceptInvitation({ token: `jwt`, password: `VerySecurePass1!` })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
