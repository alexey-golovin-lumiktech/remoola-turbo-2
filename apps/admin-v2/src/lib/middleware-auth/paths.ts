export function isAuthPagePath(pathname: string): boolean {
  return (
    pathname.startsWith(`/login`) ||
    pathname.startsWith(`/forgot-password`) ||
    pathname.startsWith(`/reset-password`) ||
    pathname.startsWith(`/accept-invite`)
  );
}

export function isLogoutPath(pathname: string): boolean {
  return pathname.startsWith(`/logout`);
}
