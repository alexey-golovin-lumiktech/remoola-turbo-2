import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

describe(`hasSavedContactByEmailQuery`, () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  async function loadSubject() {
    const findContactByExactEmail =
      jest.fn<(email: string) => Promise<{ id: string; email?: string | null; name?: string | null } | null>>();

    jest.doMock(`next/cache`, () => ({
      revalidatePath: jest.fn(),
    }));
    jest.doMock(`next/headers`, () => ({
      cookies: jest.fn(async () => ({
        toString: (): string => `consumer_session=test-cookie`,
      })),
    }));
    jest.doMock(`../consumer-api.server`, () => ({
      findContactByExactEmail,
    }));

    const subject = await import(`./contacts.server`);
    return {
      ...subject,
      findContactByExactEmail,
    };
  }

  it(`checks saved-contact existence through the backend exact-email lookup endpoint`, async () => {
    const { hasSavedContactByEmailQuery, findContactByExactEmail } = await loadSubject();
    findContactByExactEmail.mockResolvedValueOnce({ id: `contact-1`, email: `known@example.com` });

    const result = await hasSavedContactByEmailQuery(`Known@example.com`);

    expect(findContactByExactEmail).toHaveBeenCalledWith(`known@example.com`);
    expect(result).toEqual({ ok: true, found: true });
  });

  it(`returns false when the backend exact lookup finds nothing`, async () => {
    const { hasSavedContactByEmailQuery, findContactByExactEmail } = await loadSubject();
    findContactByExactEmail.mockResolvedValueOnce(null);

    const result = await hasSavedContactByEmailQuery(`missing@example.com`);

    expect(result).toEqual({ ok: true, found: false });
  });
});

describe(`deleteContactMutation`, () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    process.env.NEXT_PUBLIC_API_BASE_URL = `https://api.example.com`;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    jest.clearAllMocks();
  });

  async function loadSubject() {
    jest.doMock(`next/cache`, () => ({
      revalidatePath: jest.fn(),
    }));
    jest.doMock(`next/headers`, () => ({
      cookies: jest.fn(async () => ({
        toString: (): string => `consumer_session=test-cookie`,
      })),
    }));
    jest.doMock(`../consumer-api.server`, () => ({
      findContactByExactEmail: jest.fn(),
    }));

    return await import(`./contacts.server`);
  }

  it(`encodes dynamic contact ids before calling the backend`, async () => {
    const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
    global.fetch = fetchMock;

    const { deleteContactMutation } = await loadSubject();
    const result = await deleteContactMutation(`contact/abc?x=1`);

    expect(result).toEqual({ ok: true, message: `Contact deleted` });
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      `https://api.example.com/consumer/contacts/contact%2Fabc%3Fx%3D1`,
    );
  });
});
