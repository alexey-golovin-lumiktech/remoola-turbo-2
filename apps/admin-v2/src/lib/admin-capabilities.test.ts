import { describe, expect, it } from '@jest/globals';

import { ADMIN_CAPABILITIES, hasAdminCapability } from './admin-capabilities';

describe(`admin-v2 capability helper`, () => {
  it(`returns false when identity is null`, () => {
    expect(hasAdminCapability(null, ADMIN_CAPABILITIES.adminsManage)).toBe(false);
  });

  it(`returns false when identity is undefined`, () => {
    expect(hasAdminCapability(undefined, ADMIN_CAPABILITIES.adminsManage)).toBe(false);
  });

  it(`returns false when capabilities is empty`, () => {
    expect(hasAdminCapability({ capabilities: [] }, ADMIN_CAPABILITIES.adminsManage)).toBe(false);
  });

  it(`returns true when capability is present`, () => {
    expect(
      hasAdminCapability({ capabilities: [`admins.manage`, `documents.manage`] }, ADMIN_CAPABILITIES.adminsManage),
    ).toBe(true);
  });

  it(`returns false when capability is absent`, () => {
    expect(hasAdminCapability({ capabilities: [`documents.manage`] }, ADMIN_CAPABILITIES.adminsManage)).toBe(false);
  });
});
