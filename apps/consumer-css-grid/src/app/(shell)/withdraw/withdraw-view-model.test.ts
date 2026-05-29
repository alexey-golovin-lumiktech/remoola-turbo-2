import { describe, expect, it } from '@jest/globals';

import { buildWithdrawViewModel } from './withdraw-view-model';

describe(`withdraw-view-model`, () => {
  it(`marks withdraw flow as blocked when no bank method exists`, () => {
    const model = buildWithdrawViewModel({
      activeTab: `withdraw`,
      balances: { USD: 10_000 },
      bankMethods: [],
      isPending: false,
      paymentMethodId: ``,
      recipient: ``,
      transferAmount: ``,
      transferCurrency: `USD`,
      withdrawAmount: `10`,
      withdrawCurrency: `USD`,
    });

    expect(model.withdrawSubmitDisabled).toBe(true);
    expect(model.withdrawSubmitLabel).toBe(`Connect a bank account to continue`);
  });

  it(`marks transfer flow as blocked when requested amount exceeds balance`, () => {
    const model = buildWithdrawViewModel({
      activeTab: `transfer`,
      balances: { USD: 1_000 },
      bankMethods: [{ id: `pm-1`, type: `bank`, brand: `Bank`, last4: `1234` }],
      isPending: false,
      paymentMethodId: `pm-1`,
      recipient: `recipient@example.com`,
      transferAmount: `20`,
      transferCurrency: `USD`,
      withdrawAmount: ``,
      withdrawCurrency: `USD`,
    });

    expect(model.transferSubmitDisabled).toBe(true);
    expect(model.transferSubmitLabel).toBe(`Amount exceeds available balance`);
  });
});
