import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

import { MODULE_METADATA } from '@nestjs/common/constants';

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

function exportedProviders(moduleClass: object): unknown[] {
  return Reflect.getMetadata(MODULE_METADATA.EXPORTS, moduleClass) ?? [];
}

function expectExactExports(moduleClass: object, expected: unknown[]): void {
  expect(new Set(exportedProviders(moduleClass))).toEqual(new Set(expected));
}

function expectNotExported(moduleClass: object, forbidden: unknown[]): void {
  const exported = new Set(exportedProviders(moduleClass));
  for (const provider of forbidden) {
    expect(exported.has(provider)).toBe(false);
  }
}

function listRepositoryFiles(directory: string): string[] {
  const entries = readdirSync(directory);
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      files.push(...listRepositoryFiles(path));
      continue;
    }
    if (entry.endsWith(`.repository.ts`) && !entry.endsWith(`.spec.ts`)) {
      files.push(path);
    }
  }
  return files.sort();
}

function listSourceFiles(directory: string): string[] {
  const entries = readdirSync(directory);
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      files.push(...listSourceFiles(path));
      continue;
    }
    if (entry.endsWith(`.ts`) && !entry.endsWith(`.spec.ts`)) {
      files.push(path);
    }
  }
  return files.sort();
}

function sourceFileCounts(directory: string, pattern: RegExp): Map<string, number> {
  const counts = new Map<string, number>();
  for (const file of listSourceFiles(directory)) {
    const source = readFileSync(file, `utf8`);
    const count = source.match(pattern)?.length ?? 0;
    if (count > 0) {
      counts.set(relative(directory, file).replace(/\\/g, `/`), count);
    }
  }
  return counts;
}

function controllerFileCounts(directory: string, pattern: RegExp): Map<string, number> {
  const counts = new Map<string, number>();
  for (const file of listSourceFiles(directory).filter((path) => path.endsWith(`.controller.ts`))) {
    const source = readFileSync(file, `utf8`);
    const count = source.match(pattern)?.length ?? 0;
    if (count > 0) {
      counts.set(relative(directory, file).replace(/\\/g, `/`), count);
    }
  }
  return counts;
}

function expectSourceNotToContain(file: string, patterns: RegExp[]): void {
  const source = readFileSync(file, `utf8`);
  for (const pattern of patterns) {
    expect(source).not.toMatch(pattern);
  }
}

function mergeAllowlistBuckets(buckets: Record<string, Map<string, number>>): Map<string, number> {
  const merged = new Map<string, number>();
  for (const [bucket, files] of Object.entries(buckets)) {
    expect(files.size).toBeGreaterThan(0);
    for (const [file, count] of files.entries()) {
      expect(merged.has(file)).toBe(false);
      expect(count).toBeGreaterThan(0);
      merged.set(file, count);
    }
    expect([`external-effect`, `legacy-db-only`, `post-commit-event`]).toContain(bucket);
  }
  return merged;
}

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
    expect(sourceFileCounts(join(__dirname, `consumer`), /\.\$transaction\s*\(/g)).toEqual(new Map());
  });

  it(`keeps legacy src/dtos imports out of runtime feature code`, () => {
    expect(sourceFileCounts(join(__dirname, `auth`), /from\s+[`'"]\.\.\/dtos\//g)).toEqual(new Map());
    expect(sourceFileCounts(join(__dirname, `admin-auth`), /from\s+[`'"]\.\.\/dtos\//g)).toEqual(new Map());
    expect(sourceFileCounts(join(__dirname, `guards`), /from\s+[`'"]\.\.\/dtos\//g)).toEqual(new Map());
    expect(sourceFileCounts(join(__dirname, `consumer`), /from\s+[`'"](?:\.\.\/)+dtos\//g)).toEqual(new Map());
  });

  it(`keeps auth and backoffice dto barrels free of legacy auth exports`, () => {
    expectSourceNotToContain(join(__dirname, `dtos/consumer/index.ts`), [
      /access-consumer\.dto/,
      /forgot-password-request\.dto/,
      /jwt-payload\.dto/,
      /reset-password\.dto/,
    ]);
    expect(existsSync(join(__dirname, `dtos/backoffice/index.ts`))).toBe(false);
  });

  it(`keeps consumer and shared read models free of runtime raw-query capability branching`, () => {
    expect(
      sourceFileCounts(join(__dirname, `consumer`), /typeof\s+this\.prisma\.\$queryRaw\s*===\s*[`'"]function[`'"]/g),
    ).toEqual(new Map());
    expect(sourceFileCounts(join(__dirname, `shared`), /supportsRawContractsQuery\s*\(/g)).toEqual(new Map());
    expect(
      sourceFileCounts(
        join(__dirname, `shared`),
        /typeof\s+(?:consumerModel|this\.prisma\.\$queryRaw)\.[A-Za-z0-9_$]+\s*!==\s*[`'"]function[`'"]/g,
      ),
    ).toEqual(new Map());
  });

  it(`keeps api bootstrap creation centralized`, () => {
    const mainSource = readFileSync(join(__dirname, `main.ts`), `utf8`);
    const factorySource = readFileSync(join(__dirname, `bootstrap/create-api-app.ts`), `utf8`);

    expect(mainSource).toContain(`createApiApp`);
    expect(mainSource).not.toMatch(/NestFactory\.create/);
    expect(mainSource).not.toMatch(/waitForDatabase\(/);
    expect(mainSource).not.toMatch(/devBootstrapSeed\(/);
    expect(factorySource).toMatch(/NestFactory\.create/);
    expect(factorySource).toMatch(/configureApp\(/);
    expect(factorySource).toMatch(/waitForDatabase\(/);
    expect(factorySource).toMatch(/devBootstrapSeed\(/);
  });

  it(`keeps admin-v2 request metadata extraction in the shared decorator`, () => {
    const adminV2Dir = join(__dirname, `admin-v2`);
    const decoratorSource = readFileSync(join(__dirname, `common/decorators/request-meta.decorator.ts`), `utf8`);

    expect(sourceFileCounts(adminV2Dir, /function requestMeta\s*\(/g)).toEqual(new Map());
    expect(sourceFileCounts(adminV2Dir, /@RequestMeta\(\)/g).size).toBeGreaterThan(0);
    expect(decoratorSource).toMatch(/idempotency-key/);
    expect(decoratorSource).toMatch(/x-forwarded-for/);
  });

  it(`keeps new admin-v2 bare route id params from expanding`, () => {
    const adminV2Dir = join(__dirname, `admin-v2`);

    expect(sourceFileCounts(adminV2Dir, /@Param\(`[^`]+`\)\s+\w+:\s+string/g)).toEqual(
      new Map([
        [`admins/admin-v2-admins.controller.ts`, 11],
        [`operational-alerts/admin-v2-operational-alerts.controller.ts`, 2],
        [`quickstarts/admin-v2-quickstarts.controller.ts`, 1],
        [`saved-views/admin-v2-saved-views.controller.ts`, 2],
      ]),
    );
  });

  it(`keeps new large inline admin-v2 controller DTOs from expanding`, () => {
    const adminV2Dir = join(__dirname, `admin-v2`);

    expect(controllerFileCounts(adminV2Dir, /^class .*{/gm)).toEqual(new Map());
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
    expect(sourceFileCounts(__dirname, /@Cron\(`[^`]+`\)/g)).toEqual(new Map());
  });

  it(`keeps admin-v2 independent from consumer module implementations`, () => {
    expect(sourceFileCounts(join(__dirname, `admin-v2`), /from\s+[`'"](?:\.\.\/)+consumer\/modules\//g)).toEqual(
      new Map(),
    );
  });

  it(`keeps infrastructure independent from application verticals`, () => {
    expect(
      sourceFileCounts(join(__dirname, `infrastructure`), /from\s+[`'"](?:\.\.\/)+(?:admin-v2|consumer)\//g),
    ).toEqual(new Map());
  });

  it(`keeps file storage owned by infrastructure`, () => {
    expect(sourceFileCounts(__dirname, /consumer\/modules\/files\/(?:file-storage\.service|files\.module)/g)).toEqual(
      new Map(),
    );
    expect(sourceFileCounts(__dirname, /infrastructure\/storage\/file-storage\.service/g).size).toBeGreaterThan(0);
  });

  it(`keeps admin-v2 idempotency transaction posture explicit`, () => {
    const adminV2Dir = join(__dirname, `admin-v2`);
    const nonTransactionalExecuteAllowlist = {
      [`external-effect`]: new Map([
        [`admins/admin-v2-admin-invitations.service.ts`, 1],
        [`admins/admin-v2-admin-password-flows.service.ts`, 1],
        [`consumers/admin-v2-consumers.service.ts`, 3],
        [`verification/admin-v2-verification-decision.service.ts`, 1],
      ]),
      [`legacy-db-only`]: new Map([
        [`assignments/admin-v2-assignments.service.ts`, 3],
        [`documents/admin-document-tag.service.ts`, 3],
        [`documents/admin-document-tagger.service.ts`, 2],
        [`exchange/admin-exchange-rate-approval.service.ts`, 1],
        [`exchange/admin-scheduled-conversion-commands.service.ts`, 2],
        [`operational-alerts/admin-v2-operational-alerts.service.ts`, 3],
        [`payment-methods/admin-v2-payment-methods.service.ts`, 3],
        [`payouts/admin-v2-payout-escalation.service.ts`, 1],
        [`saved-views/admin-v2-saved-views.service.ts`, 3],
      ]),
      [`post-commit-event`]: new Map([[`exchange/admin-exchange-rule-commands.service.ts`, 3]]),
    };

    expect(sourceFileCounts(adminV2Dir, /idempotency\.executeInTransaction\s*\(/g)).toEqual(
      new Map([[`admins/admin-v2-admin-mutations.service.ts`, 4]]),
    );
    expect(sourceFileCounts(adminV2Dir, /idempotency\.execute\s*\(/g)).toEqual(
      mergeAllowlistBuckets(nonTransactionalExecuteAllowlist),
    );
  });
});
