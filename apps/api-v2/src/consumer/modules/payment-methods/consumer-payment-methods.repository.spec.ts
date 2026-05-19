import { type Cache } from 'cache-manager';

import { ConsumerPaymentMethodsRepository } from './consumer-payment-methods.repository';
import { type PrismaService } from '../../../shared/prisma.service';

describe(`ConsumerPaymentMethodsRepository`, () => {
  function buildRepository() {
    const cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
    const prisma = {
      paymentMethodModel: {
        findMany: jest.fn(),
      },
    };

    return {
      cacheManager,
      prisma,
      repository: new ConsumerPaymentMethodsRepository(
        cacheManager as unknown as Cache,
        prisma as unknown as PrismaService,
      ),
    };
  }

  it(`returns cached payment methods without hitting the database`, async () => {
    const { cacheManager, prisma, repository } = buildRepository();
    const paymentMethods = [{ id: `pm-1` }];
    cacheManager.get.mockResolvedValue(paymentMethods);

    await expect(repository.listForConsumer(`consumer-1`)).resolves.toBe(paymentMethods);

    expect(cacheManager.get).toHaveBeenCalledWith(`consumer-payment-methods:list:consumer-1`);
    expect(prisma.paymentMethodModel.findMany).not.toHaveBeenCalled();
  });

  it(`caches payment methods loaded from the database`, async () => {
    const { cacheManager, prisma, repository } = buildRepository();
    const paymentMethods = [{ id: `pm-1` }];
    cacheManager.get.mockResolvedValue(undefined);
    prisma.paymentMethodModel.findMany.mockResolvedValue(paymentMethods);

    await expect(repository.listForConsumer(`consumer-1`)).resolves.toBe(paymentMethods);

    expect(prisma.paymentMethodModel.findMany).toHaveBeenCalledWith({
      where: { consumerId: `consumer-1`, deletedAt: null },
      include: { billingDetails: true },
      orderBy: { createdAt: `desc` },
    });
    expect(cacheManager.set).toHaveBeenCalledWith(`consumer-payment-methods:list:consumer-1`, paymentMethods, 30_000);
  });

  it(`invalidates the cached list for a consumer`, async () => {
    const { cacheManager, repository } = buildRepository();

    await repository.invalidateListForConsumer(`consumer-1`);

    expect(cacheManager.del).toHaveBeenCalledWith(`consumer-payment-methods:list:consumer-1`);
  });
});
