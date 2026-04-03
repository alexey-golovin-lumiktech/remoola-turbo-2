import { ConsumerPaymentRequestsController } from './consumer-payment-requests.controller';

describe(`ConsumerPaymentRequestsController`, () => {
  const service = {
    createPaymentRequest: jest.fn(),
    sendPaymentRequest: jest.fn(),
  };

  const originResolver = {
    resolveConsumerRequestScope: jest.fn(),
  };

  const consumer = { id: `consumer-1` } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    service.sendPaymentRequest.mockResolvedValue({ paymentRequestId: `pr-1` });
    originResolver.resolveConsumerRequestScope.mockReturnValue(`consumer-mobile`);
  });

  it(`passes scope-routed consumer app scope when sending a payment request`, async () => {
    const controller = new ConsumerPaymentRequestsController(service as any, originResolver as any);
    const req = {
      headers: {
        referer: `https://mobile.example.com/payments/pr-1`,
      },
    } as any;

    const result = await controller.send(consumer, `pr-1`, req);

    expect(originResolver.resolveConsumerRequestScope).toHaveBeenCalledWith(
      undefined,
      `https://mobile.example.com/payments/pr-1`,
    );
    expect(service.sendPaymentRequest).toHaveBeenCalledWith(`consumer-1`, `pr-1`, `consumer-mobile`);
    expect(result).toEqual({ paymentRequestId: `pr-1` });
  });
});
