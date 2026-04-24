import { NotFoundException } from '@nestjs/common';

import { AdminV2QuickstartsService } from './admin-v2-quickstarts.service';

describe(`AdminV2QuickstartsService`, () => {
  it(`fails closed for unknown quickstart ids`, () => {
    const service = new AdminV2QuickstartsService();

    expect(() => service.get(`unknown` as never)).toThrow(NotFoundException);
  });
});
