import { Test, type TestingModule } from '@nestjs/testing';

import { THEME } from '@remoola/api-types';

import { ConsumerSettingsService } from './consumer-settings.service';
import { PrismaService } from '../../../shared/prisma.service';

describe(`ConsumerSettingsService`, () => {
  let service: ConsumerSettingsService;
  let prisma: {
    consumerSettingsModel: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      consumerSettingsModel: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ConsumerSettingsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(ConsumerSettingsService);
  });

  it(`returns null-safe settings with the persisted theme`, async () => {
    prisma.consumerSettingsModel.findUnique.mockResolvedValueOnce({
      theme: THEME.DARK,
      preferredCurrency: `EUR`,
    });

    await expect(service.getSettings(`consumer-1`)).resolves.toEqual({
      theme: THEME.DARK,
      preferredCurrency: `EUR`,
    });
    expect(prisma.consumerSettingsModel.findUnique).toHaveBeenCalledWith({
      where: {
        consumerId: `consumer-1`,
        deletedAt: null,
      },
    });
  });

  it(`upserts theme-only updates through patchSettings`, async () => {
    prisma.consumerSettingsModel.upsert.mockResolvedValueOnce({
      theme: THEME.SYSTEM,
      preferredCurrency: `USD`,
    });

    await expect(service.patchSettings(`consumer-2`, { theme: THEME.SYSTEM })).resolves.toEqual({
      theme: THEME.SYSTEM,
      preferredCurrency: `USD`,
    });
    expect(prisma.consumerSettingsModel.upsert).toHaveBeenCalledWith({
      where: {
        consumerId: `consumer-2`,
        deletedAt: null,
      },
      update: {
        theme: THEME.SYSTEM,
        updatedAt: expect.any(Date),
      },
      create: {
        consumerId: `consumer-2`,
        theme: THEME.SYSTEM,
      },
    });
  });

  it(`upserts theme-specific requests through updateThemeSettings`, async () => {
    prisma.consumerSettingsModel.upsert.mockResolvedValueOnce({
      theme: THEME.LIGHT,
    });

    await expect(service.updateThemeSettings(`consumer-3`, { theme: THEME.LIGHT })).resolves.toEqual({
      theme: THEME.LIGHT,
    });
    expect(prisma.consumerSettingsModel.upsert).toHaveBeenCalledWith({
      where: {
        consumerId: `consumer-3`,
        deletedAt: null,
      },
      update: {
        theme: THEME.LIGHT,
        updatedAt: expect.any(Date),
      },
      create: {
        consumerId: `consumer-3`,
        theme: THEME.LIGHT,
      },
    });
  });
});
