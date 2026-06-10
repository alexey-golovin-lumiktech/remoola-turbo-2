import { readFileSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from '@jest/globals';

import { AdminV2AccessRepository } from './admin-v2/admin-v2-access.repository';
import { AdminV2AccessService } from './admin-v2/admin-v2-access.service';
import { AdminV2DomainEventsService } from './admin-v2/admin-v2-domain-events.service';
import { ADMIN_V2_IDEMPOTENCY_OPTIONS } from './admin-v2/admin-v2-idempotency.options';
import {
  ADMIN_V2_IDEMPOTENCY_REPOSITORY,
  AdminV2IdempotencyRepository,
} from './admin-v2/admin-v2-idempotency.repository';
import { AdminV2IdempotencyService } from './admin-v2/admin-v2-idempotency.service';
import { AdminV2SharedModule } from './admin-v2/admin-v2-shared.module';
import { AdminV2AdminAccessCommandsService } from './admin-v2/admins/admin-v2-admin-access-commands.service';
import { AdminV2AdminCredentialsCommandsService } from './admin-v2/admins/admin-v2-admin-credentials-commands.service';
import { AdminV2AdminLifecycleCommandsService } from './admin-v2/admins/admin-v2-admin-lifecycle-commands.service';
import { AdminV2AdminMutationsModule } from './admin-v2/admins/admin-v2-admin-mutations.module';
import { AdminV2AdminMutationsRepository } from './admin-v2/admins/admin-v2-admin-mutations.repository';
import { AdminV2AdminsModule } from './admin-v2/admins/admin-v2-admins.module';
import { AdminV2AdminsService } from './admin-v2/admins/admin-v2-admins.service';
import { AdminV2AssignmentsModule } from './admin-v2/assignments/admin-v2-assignments.module';
import { AdminV2AssignmentsService } from './admin-v2/assignments/admin-v2-assignments.service';
import { AdminV2ConsumersController } from './admin-v2/consumers/admin-v2-consumers.controller';
import { AdminV2DocumentsController } from './admin-v2/documents/admin-v2-documents.controller';
import { AdminV2ExchangeController } from './admin-v2/exchange/admin-v2-exchange.controller';
import { AdminV2LedgerController } from './admin-v2/ledger/admin-v2-ledger.controller';
import { AdminV2LedgerModule } from './admin-v2/ledger/admin-v2-ledger.module';
import { AdminV2LedgerService } from './admin-v2/ledger/admin-v2-ledger.service';
import { AdminV2LedgerAnomaliesController } from './admin-v2/ledger/anomalies/admin-v2-ledger-anomalies.controller';
import { AdminV2LedgerAnomaliesService } from './admin-v2/ledger/anomalies/admin-v2-ledger-anomalies.service';
import { AdminV2PaymentMethodsController } from './admin-v2/payment-methods/admin-v2-payment-methods.controller';
// eslint-disable-next-line max-len
import { AdminV2PaymentReversalRefundFinalizerService } from './admin-v2/payments/admin-v2-payment-reversal-refund-finalizer.service';
import { AdminV2PaymentReversalWorkflowService } from './admin-v2/payments/admin-v2-payment-reversal-workflow.service';
import { AdminV2PaymentsController } from './admin-v2/payments/admin-v2-payments.controller';
import { AdminV2PaymentsModule } from './admin-v2/payments/admin-v2-payments.module';
import { AdminV2PaymentsService } from './admin-v2/payments/admin-v2-payments.service';
import { AdminV2PayoutsController } from './admin-v2/payouts/admin-v2-payouts.controller';
import { AdminV2VerificationController } from './admin-v2/verification/admin-v2-verification.controller';
import {
  adminStepUpVerifyAllowlist,
  bareRouteIdParamsAllowlist,
  nonTransactionalExecuteAllowlist,
} from './architecture/boundary-allowlists';
import {
  expectControllerMatchesAllowlist,
  expectExactExports,
  expectFileContains,
  expectFileMissing,
  expectFileNotContains,
  expectNoControllerMatches,
  expectNoSourceMatches,
  expectNotExported,
  mergeAllowlistBuckets,
  expectSourceMatchesAllowlist,
} from './architecture/module-boundary-test-helpers';
import { listRepositoryFiles, sourceFileCounts } from './architecture/source-scan.utils';
import { RESPONSE_CONTRACT_METADATA } from './common';
import { AdminActionAuditRepository } from './shared/admin-action-audit.repository';
import { AdminActionAuditService } from './shared/admin-action-audit.service';
import { AuthAuditModule } from './shared/auth-audit.module';
import { AuthAuditQuery } from './shared/auth-audit.query';
import { AuthAuditRepository } from './shared/auth-audit.repository';
import { AuthAuditService } from './shared/auth-audit.service';
import { ConsumerActionLogQuery } from './shared/consumer-action-log.query';
import { ConsumerActionLogRepository } from './shared/consumer-action-log.repository';
import { ConsumerActionLogService } from './shared/consumer-action-log.service';
import { PrismaTransactionRunner } from './shared/prisma-transaction.runner';
import { PrismaModule } from './shared/prisma.module';
import { PrismaService } from './shared/prisma.service';

const adminV2Dir = join(__dirname, `admin-v2`);
const authDir = join(__dirname, `auth`);
const adminAuthDir = join(__dirname, `admin-auth`);
const guardsDir = join(__dirname, `guards`);
const consumerDir = join(__dirname, `consumer`);
const sharedDir = join(__dirname, `shared`);
const commonDir = join(__dirname, `common`);
const infrastructureDir = join(__dirname, `infrastructure`);
const sharedCommonDir = join(__dirname, `shared-common`);
const mainFile = join(__dirname, `main.ts`);
const createApiAppFile = join(__dirname, `bootstrap/create-api-app.ts`);
const requestMetaDecoratorFile = join(__dirname, `common/decorators/request-meta.decorator.ts`);
const consumerDtoBarrel = join(__dirname, `dtos/consumer/index.ts`);
const backofficeDtoBarrel = join(__dirname, `dtos/backoffice/index.ts`);

describe(`Nest module provider boundaries`, () => {
  it(`keeps the admin-v2 shared public surface explicit`, () => {
    expectExactExports(AdminV2SharedModule, [
      AdminV2AccessService,
      AdminV2IdempotencyService,
      AdminV2DomainEventsService,
    ]);
    expectNotExported(AdminV2SharedModule, [
      AdminV2AccessRepository,
      AdminV2IdempotencyRepository,
      ADMIN_V2_IDEMPOTENCY_REPOSITORY,
      ADMIN_V2_IDEMPOTENCY_OPTIONS,
    ]);
  });

  it(`exports only the payments facade from the payments module`, () => {
    expectExactExports(AdminV2PaymentsModule, [AdminV2PaymentsService]);
    expectNotExported(AdminV2PaymentsModule, [
      AdminV2PaymentReversalWorkflowService,
      AdminV2PaymentReversalRefundFinalizerService,
    ]);
  });

  it(`exports only feature facades from admin-v2 feature modules`, () => {
    expectExactExports(AdminV2AdminsModule, [AdminV2AdminsService]);
    expectExactExports(AdminV2AssignmentsModule, [AdminV2AssignmentsService]);
    expectExactExports(AdminV2LedgerModule, [AdminV2LedgerService, AdminV2LedgerAnomaliesService]);
  });

  it(`exports only explicit admin mutation command providers from the mutations module`, () => {
    expectExactExports(AdminV2AdminMutationsModule, [
      AdminV2AdminCredentialsCommandsService,
      AdminV2AdminLifecycleCommandsService,
      AdminV2AdminAccessCommandsService,
    ]);
    expectNotExported(AdminV2AdminMutationsModule, [AdminV2AdminMutationsRepository]);
  });

  it(`keeps the shared audit public surface explicit`, () => {
    expectExactExports(AuthAuditModule, [AuthAuditService, AdminActionAuditService, ConsumerActionLogService]);
    expectNotExported(AuthAuditModule, [
      AdminActionAuditRepository,
      AuthAuditQuery,
      AuthAuditRepository,
      ConsumerActionLogQuery,
      ConsumerActionLogRepository,
    ]);
  });

  it(`keeps prisma infrastructure exports explicit`, () => {
    expectExactExports(PrismaModule, [PrismaService, PrismaTransactionRunner]);
  });

  it(`routes admin-v2 repository transactions through PrismaTransactionRunner`, () => {
    const repositoryFiles = listRepositoryFiles(join(__dirname, `admin-v2`));

    expect(repositoryFiles.length).toBeGreaterThan(0);
    for (const file of repositoryFiles) {
      const source = readFileSync(file, `utf8`);
      expect(source).not.toMatch(/\.\$transaction\s*\(/);
    }
  });

  it(`routes consumer runtime transactions through PrismaTransactionRunner`, () => {
    expectNoSourceMatches(consumerDir, /\.\$transaction\s*\(/g);
  });

  it(`keeps legacy src/dtos imports out of runtime feature code`, () => {
    expectNoSourceMatches(authDir, /from\s+[`'"]\.\.\/dtos\//g);
    expectNoSourceMatches(adminAuthDir, /from\s+[`'"]\.\.\/dtos\//g);
    expectNoSourceMatches(guardsDir, /from\s+[`'"]\.\.\/dtos\//g);
    expectNoSourceMatches(consumerDir, /from\s+[`'"](?:\.\.\/)+dtos\//g);
  });

  it(`keeps auth and backoffice dto barrels free of legacy auth exports`, () => {
    expectFileMissing(consumerDtoBarrel);
    expectFileMissing(backofficeDtoBarrel);
  });

  it(`keeps consumer and shared read models free of runtime raw-query capability branching`, () => {
    expectNoSourceMatches(consumerDir, /typeof\s+this\.prisma\.\$queryRaw\s*===\s*[`'"]function[`'"]/g);
    expectNoSourceMatches(sharedDir, /supportsRawContractsQuery\s*\(/g);
    expectNoSourceMatches(
      sharedDir,
      /typeof\s+(?:consumerModel|this\.prisma\.\$queryRaw)\.[A-Za-z0-9_$]+\s*!==\s*[`'"]function[`'"]/g,
    );
  });

  it(`keeps api bootstrap creation centralized`, () => {
    expectFileContains(mainFile, `createApiApp`);
    expectFileNotContains(mainFile, /NestFactory\.create/);
    expectFileNotContains(mainFile, /waitForDatabase\(/);
    expectFileNotContains(mainFile, /devBootstrapSeed\(/);
    expectFileContains(createApiAppFile, /NestFactory\.create/);
    expectFileContains(createApiAppFile, /configureApp\(/);
    expectFileContains(createApiAppFile, /waitForDatabase\(/);
    expectFileContains(createApiAppFile, /devBootstrapSeed\(/);
  });

  it(`keeps admin-v2 request metadata extraction in the shared decorator`, () => {
    expectNoSourceMatches(adminV2Dir, /function requestMeta\s*\(/g);
    expect(sourceFileCounts(adminV2Dir, /@RequestMeta\(\)/g).size).toBeGreaterThan(0);
    expectFileContains(requestMetaDecoratorFile, /idempotency-key/);
    expectFileContains(requestMetaDecoratorFile, /x-forwarded-for/);
  });

  it(`keeps new admin-v2 bare route id params from expanding`, () => {
    expectSourceMatchesAllowlist(adminV2Dir, /@Param\(`[^`]+`\)\s+\w+:\s+string/g, bareRouteIdParamsAllowlist);
  });

  it(`keeps new large inline admin-v2 controller DTOs from expanding`, () => {
    expectNoControllerMatches(adminV2Dir, /^class .*{/gm);
  });

  it(`marks migrated admin-v2 plain-object response contracts explicitly`, () => {
    for (const controller of [
      AdminV2ConsumersController,
      AdminV2DocumentsController,
      AdminV2ExchangeController,
      AdminV2LedgerController,
      AdminV2LedgerAnomaliesController,
      AdminV2PaymentMethodsController,
      AdminV2PaymentsController,
      AdminV2PayoutsController,
      AdminV2VerificationController,
    ]) {
      const metadata = Reflect.getMetadata(RESPONSE_CONTRACT_METADATA, controller);
      expect(metadata).toMatchObject({ kind: `plain-object` });
    }
  });

  it(`keeps fixed scheduler cron expressions behind the shared scheduler policy`, () => {
    expectNoSourceMatches(__dirname, /@Cron\(`[^`]+`\)/g);
  });

  it(`keeps admin-v2 independent from consumer module implementations`, () => {
    expectNoSourceMatches(adminV2Dir, /from\s+[`'"](?:\.\.\/)+consumer\/modules\//g);
  });

  it(`keeps infrastructure independent from application verticals`, () => {
    expectNoSourceMatches(infrastructureDir, /from\s+[`'"](?:\.\.\/)+(?:admin-v2|consumer)\//g);
  });

  it(`keeps the shared services layer independent from common and feature verticals`, () => {
    expectNoSourceMatches(sharedDir, /from\s+[`'"](?:\.\.\/)+common\//g);
    expectNoSourceMatches(sharedDir, /from\s+[`'"](?:\.\.\/)+(?:admin-v2|consumer|auth|admin-auth)\//g);
  });

  it(`keeps the common HTTP layer independent from feature verticals`, () => {
    expectNoSourceMatches(commonDir, /from\s+[`'"](?:\.\.\/)+(?:admin-v2|consumer|auth|admin-auth)\//g);
  });

  it(`keeps admin step-up checks on sensitive admin-v2 controllers`, () => {
    expectControllerMatchesAllowlist(adminV2Dir, /adminStepUp\.verify\s*\(/g, adminStepUpVerifyAllowlist);
    expectNoSourceMatches(adminV2Dir, /verifyStepUp\s*\(/g);
  });

  it(`keeps shared-common leaf kit free of common and feature-vertical imports`, () => {
    expectNoSourceMatches(sharedCommonDir, /from\s+[`'"](?:\.\.\/)+common\//g);
    expectNoSourceMatches(sharedCommonDir, /from\s+[`'"](?:\.\.\/)+(?:admin-v2|consumer|auth|admin-auth)\//g);
  });

  it(`keeps file storage owned by infrastructure`, () => {
    expectNoSourceMatches(__dirname, /consumer\/modules\/files\/(?:file-storage\.service|files\.module)/g);
    expect(sourceFileCounts(__dirname, /infrastructure\/storage\/file-storage\.service/g).size).toBeGreaterThan(0);
  });

  it(`keeps admin-v2 idempotency transaction posture explicit`, () => {
    expect(sourceFileCounts(adminV2Dir, /idempotency\.executeInTransaction\s*\(/g)).toEqual(
      new Map([
        [`admins/admin-v2-admin-access-commands.service.ts`, 2],
        [`admins/admin-v2-admin-lifecycle-commands.service.ts`, 2],
      ]),
    );
    expect(sourceFileCounts(adminV2Dir, /idempotency\.execute\s*\(/g)).toEqual(
      mergeAllowlistBuckets(nonTransactionalExecuteAllowlist),
    );
  });
});
