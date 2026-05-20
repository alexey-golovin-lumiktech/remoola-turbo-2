export function normalizeActivePath(rawPath: string | null | undefined): string | null {
  if (!rawPath) {
    return null;
  }

  try {
    return new URL(rawPath, `http://localhost`).pathname;
  } catch {
    return rawPath.split(`?`, 1)[0] ?? rawPath;
  }
}

export function getActivePathFromHeaders(headerStore: { get(name: string): string | null }): string | null {
  const pathname = headerStore.get(`x-pathname`);
  if (pathname) {
    return normalizeActivePath(pathname);
  }

  return normalizeActivePath(headerStore.get(`next-url`));
}

export function isNavItemActive(itemHref: string, activePath: string | null | undefined): boolean {
  if (!activePath) {
    return false;
  }

  if (activePath === itemHref) {
    return true;
  }

  return activePath.startsWith(`${itemHref}/`);
}
