const ADMIN_API_PATH_PREFIXES = [`/api/admin-v2/`] as const;

export function isAdminApiPath(path: string): boolean {
  return ADMIN_API_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export function getAdminApiPathPrefixes(): readonly string[] {
  return ADMIN_API_PATH_PREFIXES;
}
