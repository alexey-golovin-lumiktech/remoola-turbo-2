import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';

import { THEME } from '@remoola/api-types';

import { ConsumerSettingsRepository } from './consumer-settings.repository';
import { ConsumerSettingsService } from './consumer-settings.service';

describe(`ConsumerSettingsService`, () => {
  let service: ConsumerSettingsService;
  let settingsRepository: {
    findActiveByConsumerId: jest.Mock<(...a: any[]) => any>;
    upsertTheme: jest.Mock<(...a: any[]) => any>;
    upsertPreferredCurrency: jest.Mock<(...a: any[]) => any>;
    patchSettings: jest.Mock<(...a: any[]) => any>;
  };

  beforeEach(async () => {
    settingsRepository = {
      findActiveByConsumerId: jest.fn<(...a: any[]) => any>(),
      upsertTheme: jest.fn<(...a: any[]) => any>(),
      upsertPreferredCurrency: jest.fn<(...a: any[]) => any>(),
      patchSettings: jest.fn<(...a: any[]) => any>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ConsumerSettingsService, { provide: ConsumerSettingsRepository, useValue: settingsRepository }],
    }).compile();

    service = module.get(ConsumerSettingsService);
  });

  it(`returns null-safe settings with the persisted theme`, async () => {
    settingsRepository.findActiveByConsumerId.mockResolvedValueOnce({
      theme: THEME.DARK,
      preferredCurrency: `EUR`,
    });

    await expect(service.getSettings(`consumer-1`)).resolves.toEqual({
      theme: THEME.DARK,
      preferredCurrency: `EUR`,
    });
    expect(settingsRepository.findActiveByConsumerId).toHaveBeenCalledWith(`consumer-1`);
  });

  it(`upserts theme-only updates through patchSettings`, async () => {
    settingsRepository.patchSettings.mockResolvedValueOnce({
      theme: THEME.SYSTEM,
      preferredCurrency: `USD`,
    });

    await expect(service.patchSettings(`consumer-2`, { theme: THEME.SYSTEM })).resolves.toEqual({
      theme: THEME.SYSTEM,
      preferredCurrency: `USD`,
    });
    expect(settingsRepository.patchSettings).toHaveBeenCalledWith(
      `consumer-2`,
      expect.objectContaining({
        theme: THEME.SYSTEM,
        updatedAt: expect.any(Date),
      }),
    );
  });

  it(`upserts theme-specific requests through updateThemeSettings`, async () => {
    settingsRepository.upsertTheme.mockResolvedValueOnce({
      theme: THEME.LIGHT,
    });

    await expect(service.updateThemeSettings(`consumer-3`, { theme: THEME.LIGHT })).resolves.toEqual({
      theme: THEME.LIGHT,
    });
    expect(settingsRepository.upsertTheme).toHaveBeenCalledWith(`consumer-3`, THEME.LIGHT);
  });
});
