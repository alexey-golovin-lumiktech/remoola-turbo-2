import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

import { updatePasswordAction } from './actions';
import { getBypassHeaders, getRequestOrigin } from '../../lib/request-origin';

jest.mock(`next/cache`, () => ({
  revalidatePath: jest.fn(),
}));

jest.mock(`next/headers`, () => ({
  headers: jest.fn(),
}));

jest.mock(`../../lib/request-origin`, () => ({
  getRequestOrigin: jest.fn(),
  getBypassHeaders: jest.fn(),
}));

describe(`updatePasswordAction`, () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    (headers as jest.Mock).mockResolvedValue(
      new Headers({
        cookie: `consumer_access_token=test`,
      }),
    );
    (getRequestOrigin as jest.Mock).mockReturnValue(`http://localhost:3002`);
    (getBypassHeaders as jest.Mock).mockReturnValue({});
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'content-type': `application/json` },
      }),
    ) as unknown as typeof fetch;
    (revalidatePath as jest.Mock).mockClear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it(`returns success and does not revalidate settings on password-change success`, async () => {
    const formData = new FormData();
    formData.set(`currentPassword`, `OldPass123!`);
    formData.set(`password`, `NewPass123!`);
    formData.set(`confirmPassword`, `NewPass123!`);

    const result = await updatePasswordAction(formData);

    expect(result).toEqual({ ok: true, data: { success: true } });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it(`allows first password set without current password`, async () => {
    const formData = new FormData();
    formData.set(`password`, `NewPass123!`);
    formData.set(`confirmPassword`, `NewPass123!`);

    const result = await updatePasswordAction(formData, false);

    expect(result).toEqual({ ok: true, data: { success: true } });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, request] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(request.body).toBe(JSON.stringify({ password: `NewPass123!` }));
  });
});
