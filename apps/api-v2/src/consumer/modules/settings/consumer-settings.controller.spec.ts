import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';

import { THEME } from '@remoola/api-types';

import { ConsumerSettingsController } from './consumer-settings.controller';
import { ConsumerSettingsService } from './consumer-settings.service';
import { JwtAuthGuard } from '../../../auth/jwt.guard';

describe(`ConsumerSettingsController`, () => {
  let controller: ConsumerSettingsController;
  let service: {
    getSettings: jest.Mock;
    patchSettings: jest.Mock;
    getThemeSettings: jest.Mock;
    updateThemeSettings: jest.Mock;
    updatePreferredCurrency: jest.Mock;
  };

  const consumer = {
    id: `consumer-1`,
  } as never;

  beforeEach(async () => {
    service = {
      getSettings: jest.fn(),
      patchSettings: jest.fn(),
      getThemeSettings: jest.fn(),
      updateThemeSettings: jest.fn(),
      updatePreferredCurrency: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [ConsumerSettingsController],
      providers: [{ provide: ConsumerSettingsService, useValue: service }],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(ConsumerSettingsController);
  });

  it(`patches combined settings including theme`, async () => {
    service.patchSettings.mockResolvedValueOnce({
      theme: THEME.DARK,
      preferredCurrency: `USD`,
    });

    const result = await controller.patchSettings(consumer, { theme: THEME.DARK });

    expect(service.patchSettings).toHaveBeenCalledWith(`consumer-1`, { theme: THEME.DARK });
    expect(result).toEqual({
      theme: THEME.DARK,
      preferredCurrency: `USD`,
    });
  });

  it(`updates the dedicated theme endpoint`, async () => {
    service.updateThemeSettings.mockResolvedValueOnce({ theme: THEME.SYSTEM });

    const result = await controller.updateThemeSettings(consumer, { theme: THEME.SYSTEM });

    expect(service.updateThemeSettings).toHaveBeenCalledWith(`consumer-1`, { theme: THEME.SYSTEM });
    expect(result).toEqual({ theme: THEME.SYSTEM });
  });
});
