import { ConsumerPaymentsController } from './consumer-payments.controller';

describe(`ConsumerPaymentsController`, () => {
  const service = {
    startPayment: jest.fn(),
  };

  const invoiceService = {} as any;
  const originResolver = {
    resolveConsumerRequestScope: jest.fn(),
  };

  const consumer = { id: `consumer-1` } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    service.startPayment.mockResolvedValue({ paymentRequestId: `pr-1` });
    originResolver.resolveConsumerRequestScope.mockReturnValue(`consumer-mobile`);
  });

  it(`passes scope-routed consumer app scope when starting a payment`, async () => {
    const controller = new ConsumerPaymentsController(service as any, invoiceService, originResolver as any);
    const body = { email: `payer@example.com`, amount: `10`, method: `CREDIT_CARD` } as any;
    const req = {
      headers: {
        origin: `https://mobile.example.com`,
      },
    } as any;

    const result = await controller.startPayment(consumer, body, req);

    expect(originResolver.resolveConsumerRequestScope).toHaveBeenCalledWith(`https://mobile.example.com`, undefined);
    expect(service.startPayment).toHaveBeenCalledWith(`consumer-1`, body, `consumer-mobile`);
    expect(result).toEqual({ paymentRequestId: `pr-1` });
  });
});
