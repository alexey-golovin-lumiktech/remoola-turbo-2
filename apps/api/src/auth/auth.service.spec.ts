import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';

import { AuthService } from './auth.service';
import { envs } from '../envs';
import { PrismaService } from '../shared/prisma.service';

jest.mock(`bcryptjs`, () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe(`AuthService`, () => {
  let service: AuthService;
  let prisma: {
    adminModel: { findFirst: jest.Mock; findUnique: jest.Mock; create: jest.Mock };
    accessRefreshTokenModel: { create: jest.Mock };
  };
  let jwt: { sign: jest.Mock; verify: jest.Mock };
  let bcryptCompare: jest.Mock;

  beforeEach(async () => {
    const bcrypt = await import(`bcryptjs`);
    bcryptCompare = bcrypt.compare as unknown as jest.Mock;
    bcryptCompare.mockReset();

    prisma = {
      adminModel: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      accessRefreshTokenModel: {
        create: jest.fn(),
      },
    };
    jwt = {
      sign: jest.fn().mockReturnValue(`access-token`),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService, { provide: PrismaService, useValue: prisma }, { provide: JwtService, useValue: jwt }],
    }).compile();

    service = module.get(AuthService);
  });

  it(`signs admin access token with scope claim during login`, async () => {
    const identity = {
      id: `admin-1`,
      email: `admin@example.com`,
      password: `hashed`,
      type: `ADMIN`,
      salt: `salt`,
      deletedAt: null,
    };
    prisma.adminModel.findFirst.mockResolvedValue(identity);
    bcryptCompare.mockResolvedValue(true);

    const result = await service.login({ email: `admin@example.com`, password: `secret` });

    expect(jwt.sign).toHaveBeenCalledWith(
      { sub: identity.id, email: identity.email, scope: `admin` },
      { secret: envs.JWT_ACCESS_SECRET, expiresIn: envs.JWT_ACCESS_TTL_SECONDS },
    );
    expect(result).toMatchObject({
      id: identity.id,
      email: identity.email,
      type: identity.type,
      accessToken: `access-token`,
    });
  });

  it(`uses refresh secret for verify and keeps scoped access token on refresh`, async () => {
    const identity = {
      id: `admin-2`,
      email: `admin2@example.com`,
      password: `hashed`,
      type: `ADMIN`,
      salt: `salt`,
    };
    jwt.verify.mockReturnValue({ sub: identity.id });
    prisma.adminModel.findUnique.mockResolvedValue(identity);

    const result = await service.refresh(`refresh-token`);

    expect(jwt.verify).toHaveBeenCalledWith(`refresh-token`, { secret: envs.JWT_REFRESH_SECRET });
    expect(jwt.sign).toHaveBeenCalledWith(
      { sub: identity.id, email: identity.email, scope: `admin` },
      { secret: envs.JWT_ACCESS_SECRET, expiresIn: envs.JWT_ACCESS_TTL_SECONDS },
    );
    expect(result).toMatchObject({
      id: identity.id,
      email: identity.email,
      type: identity.type,
      accessToken: `access-token`,
    });
  });

  it(`throws UnauthorizedException when credentials are invalid`, async () => {
    prisma.adminModel.findFirst.mockResolvedValue(null);

    await expect(service.login({ email: `missing@example.com`, password: `secret` })).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
