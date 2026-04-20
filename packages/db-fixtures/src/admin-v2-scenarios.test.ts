import assert from 'node:assert/strict';
import test from 'node:test';

import { $Enums } from '@remoola/database-2';

import { FIXTURE_NAMESPACE, getAdminV2ScenarioPack } from './admin-v2-scenarios';

test(`admin-v2 scenario pack covers core workspace states`, () => {
  const pack = getAdminV2ScenarioPack(new Date(`2026-04-15T12:00:00.000Z`));

  assert.equal(pack.namespace, FIXTURE_NAMESPACE);
  assert.ok(pack.admins.length >= 4);
  assert.ok(pack.consumers.length >= 10);

  const verificationStates = new Set(pack.consumers.map((item) => item.verificationStatus));
  assert.ok(verificationStates.has($Enums.VerificationStatus.APPROVED));
  assert.ok(verificationStates.has($Enums.VerificationStatus.PENDING));
  assert.ok(verificationStates.has($Enums.VerificationStatus.MORE_INFO));
  assert.ok(verificationStates.has($Enums.VerificationStatus.FLAGGED));
  assert.ok(verificationStates.has($Enums.VerificationStatus.REJECTED));

  const paymentStates = new Set(pack.paymentRequests.map((item) => item.status));
  assert.ok(paymentStates.has($Enums.TransactionStatus.COMPLETED));
  assert.ok(paymentStates.has($Enums.TransactionStatus.PENDING));
  assert.ok(paymentStates.has($Enums.TransactionStatus.UNCOLLECTIBLE));
  assert.ok(paymentStates.has($Enums.TransactionStatus.DENIED));
  assert.ok(paymentStates.has($Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL));

  const scheduledStates = new Set(pack.scheduledConversions.map((item) => item.status));
  assert.ok(scheduledStates.has($Enums.ScheduledFxConversionStatus.PENDING));
  assert.ok(scheduledStates.has($Enums.ScheduledFxConversionStatus.PROCESSING));
  assert.ok(scheduledStates.has($Enums.ScheduledFxConversionStatus.FAILED));
  assert.ok(scheduledStates.has($Enums.ScheduledFxConversionStatus.EXECUTED));

  assert.ok(
    pack.ledgerEntries.some((item) => item.type === $Enums.LedgerEntryType.USER_PAYOUT && item.outcomes.length > 0),
  );
  assert.ok(pack.ledgerEntries.some((item) => item.disputes.length > 0));

  const suspicious = pack.consumers.find((item) => item.key === `suspicious-auth-consumer`);
  const flagged = pack.consumers.find((item) => item.key === `flagged-risk-consumer`);
  assert.ok(suspicious);
  assert.ok(flagged);
  assert.equal(suspicious?.paymentMethods[0]?.stripeFingerprint, flagged?.paymentMethods[0]?.stripeFingerprint);
});

test(`admin-v2 consumers use only allowed account shapes`, () => {
  const pack = getAdminV2ScenarioPack(new Date(`2026-04-15T12:00:00.000Z`));

  for (const consumer of pack.consumers) {
    if (consumer.accountType === $Enums.AccountType.BUSINESS) {
      assert.equal(consumer.contractorKind ?? null, null);
      continue;
    }

    assert.equal(consumer.accountType, $Enums.AccountType.CONTRACTOR);
    assert.ok(
      consumer.contractorKind === $Enums.ContractorKind.INDIVIDUAL ||
        consumer.contractorKind === $Enums.ContractorKind.ENTITY,
    );
  }
});
