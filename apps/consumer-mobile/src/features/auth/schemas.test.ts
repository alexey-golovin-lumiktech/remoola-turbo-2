import { loginSchema, parseSearchParams } from './schemas';

describe(`loginSchema`, () => {
  it(`passes with valid email and password`, () => {
    const result = loginSchema.safeParse({ email: `user@example.com`, password: `secret123` });
    expect(result.success).toBe(true);
  });

  it(`fails when email is empty`, () => {
    const result = loginSchema.safeParse({ email: ``, password: `secret123` });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email?.[0]).toContain(`required`);
    }
  });

  it(`fails when email is invalid`, () => {
    const result = loginSchema.safeParse({ email: `not-an-email`, password: `secret123` });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email?.[0]).toContain(`Enter a valid email address`);
    }
  });

  it(`fails when password is empty`, () => {
    const result = loginSchema.safeParse({ email: `user@example.com`, password: `` });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password?.[0]).toContain(`required`);
    }
  });
});

describe(`parseSearchParams`, () => {
  it(`returns default nextPath when next is missing`, () => {
    const { nextPath } = parseSearchParams({});
    expect(nextPath).toBe(`/dashboard`);
  });

  it(`returns decoded next path when next is provided`, () => {
    const { nextPath } = parseSearchParams({ next: `/settings` });
    expect(nextPath).toBe(`/settings`);
  });

  it(`uses first element when next is array`, () => {
    const { nextPath } = parseSearchParams({ next: [`/payments`] });
    expect(nextPath).toBe(`/payments`);
  });

  it(`returns default nextPath when next is absolute http URL`, () => {
    const { nextPath } = parseSearchParams({ next: `https://evil.com` });
    expect(nextPath).toBe(`/dashboard`);
  });

  it(`returns default nextPath when next is protocol-relative URL`, () => {
    const { nextPath } = parseSearchParams({ next: `//evil.com` });
    expect(nextPath).toBe(`/dashboard`);
  });

  it(`returns default nextPath when next is javascript URL`, () => {
    const { nextPath } = parseSearchParams({ next: `javascript:alert(1)` });
    expect(nextPath).toBe(`/dashboard`);
  });

  it(`returns default nextPath when next decodes to protocol-relative URL`, () => {
    const { nextPath } = parseSearchParams({ next: `%2F%2Fevil.example%2Fphish` });
    expect(nextPath).toBe(`/dashboard`);
  });

  it(`returns default nextPath when next has malformed encoding`, () => {
    const { nextPath } = parseSearchParams({ next: `%E0%A4%A` });
    expect(nextPath).toBe(`/dashboard`);
  });

  it(`returns default nextPath when next contains CRLF`, () => {
    const { nextPath } = parseSearchParams({ next: `/dashboard%0d%0aSet-Cookie%3Aevil%3D1` });
    expect(nextPath).toBe(`/dashboard`);
  });

  it(`returns default nextPath when next points to logout`, () => {
    const { nextPath } = parseSearchParams({ next: `/logout` });
    expect(nextPath).toBe(`/dashboard`);
  });

  it(`parses reset_success auth notice`, () => {
    const { authNotice } = parseSearchParams({ auth_notice: `reset_success` });
    expect(authNotice).toBe(`reset_success`);
  });

  it(`parses password_changed auth notice`, () => {
    const { authNotice } = parseSearchParams({ auth_notice: `password_changed` });
    expect(authNotice).toBe(`password_changed`);
  });

  it(`ignores unknown auth notice values`, () => {
    const { authNotice } = parseSearchParams({ auth_notice: `something_else` });
    expect(authNotice).toBeUndefined();
  });
});
