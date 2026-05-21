// Shell route hrefs used by both ShellNav and nav coverage tests.
// Add a new entry here whenever a new route is added to app/(shell)/.

export const sidebarHrefs = [
  `/dashboard`,
  `/contracts`,
  `/payments`,
  `/documents`,
  `/contacts`,
  `/banking`,
  `/withdraw`,
  `/exchange`,
  `/settings`,
  `/help`,
] as const;

// Subset shown in the mobile bottom nav (limited to 6 items).
export const mobileNavHrefs = [`/dashboard`, `/payments`, `/exchange`, `/contracts`, `/contacts`, `/settings`] as const;
