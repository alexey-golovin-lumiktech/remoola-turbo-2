import { S3ClientProvider, s3ClientProvider } from './s3-client.provider';

describe(`S3ClientProvider`, () => {
  it(`exposes one S3 client instance through the injection-token provider`, () => {
    const provider = new S3ClientProvider();

    expect(s3ClientProvider.useFactory(provider)).toBe(provider.getClient());
    provider.onModuleDestroy();
  });

  it(`destroys the S3 client once during Nest shutdown lifecycle`, () => {
    const provider = new S3ClientProvider();
    const client = provider.getClient();

    if (!client) {
      throw new Error(`Expected S3 client to be configured in the test environment`);
    }
    const destroy = jest.spyOn(client, `destroy`).mockImplementation(() => undefined);

    provider.onModuleDestroy();
    provider.onApplicationShutdown();

    expect(destroy).toHaveBeenCalledTimes(1);
  });
});
