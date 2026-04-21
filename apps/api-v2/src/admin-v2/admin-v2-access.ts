import { ForbiddenException } from '@nestjs/common';

export const ADMIN_V2_BRIDGE_ROLES = [`SUPER_ADMIN`, `OPS_ADMIN`] as const;
export const ADMIN_V2_SCHEMA_ROLES = [
  `SUPER_ADMIN`,
  `OPS_ADMIN`,
  `SUPPORT_ADMIN`,
  `RISK_ADMIN`,
  `FINANCE_ADMIN`,
  `READONLY_ADMIN`,
] as const;

export type AdminV2BridgeRole = (typeof ADMIN_V2_BRIDGE_ROLES)[number];
export type AdminV2Role = (typeof ADMIN_V2_SCHEMA_ROLES)[number];
export type AdminV2Workspace =
  | `overview`
  | `verification`
  | `consumers`
  | `payments`
  | `ledger`
  | `audit`
  | `exchange`
  | `documents`
  | `admins`
  | `payment_methods`
  | `system`;
export type AdminV2Capability =
  | `me.read`
  | `overview.read`
  | `verification.read`
  | `consumers.read`
  | `payments.read`
  | `ledger.read`
  | `ledger.anomalies`
  | `exchange.read`
  | `exchange.manage`
  | `documents.read`
  | `documents.manage`
  | `payment_methods.read`
  | `payment_methods.manage`
  | `system.read`
  | `admins.read`
  | `admins.manage`
  | `payouts.escalate`
  | `consumers.notes`
  | `consumers.flags`
  | `consumers.force_logout`
  | `consumers.suspend`
  | `consumers.email_resend`
  | `audit.read`
  | `verification.decide`
  | `assignments.manage`
  | `saved_views.manage`
  | `alerts.manage`;

export type AdminV2AccessSource = `bridge` | `schema` | `bridge-fallback`;
export type AdminV2AccessProfile = {
  role: AdminV2Role | null;
  capabilities: AdminV2Capability[];
  workspaces: AdminV2Workspace[];
  source: AdminV2AccessSource;
};

export const KNOWN_ADMIN_V2_CAPABILITIES: readonly AdminV2Capability[] = [
  `me.read`,
  `overview.read`,
  `verification.read`,
  `consumers.read`,
  `payments.read`,
  `ledger.read`,
  `ledger.anomalies`,
  `exchange.read`,
  `exchange.manage`,
  `documents.read`,
  `documents.manage`,
  `payment_methods.read`,
  `payment_methods.manage`,
  `system.read`,
  `admins.read`,
  `admins.manage`,
  `payouts.escalate`,
  `consumers.notes`,
  `consumers.flags`,
  `consumers.force_logout`,
  `consumers.suspend`,
  `consumers.email_resend`,
  `audit.read`,
  `verification.decide`,
  `assignments.manage`,
  `saved_views.manage`,
  `alerts.manage`,
] as const;

export const ACTIVE_ADMIN_V2_CAPABILITIES: readonly AdminV2Capability[] = [
  `me.read`,
  `overview.read`,
  `verification.read`,
  `consumers.read`,
  `payments.read`,
  `ledger.read`,
  `ledger.anomalies`,
  `exchange.read`,
  `documents.read`,
  `payment_methods.read`,
  `system.read`,
  `consumers.notes`,
  `consumers.flags`,
  `audit.read`,
  `assignments.manage`,
  `saved_views.manage`,
  `alerts.manage`,
];

export const OVERRIDABLE_ADMIN_V2_CAPABILITIES: readonly AdminV2Capability[] = KNOWN_ADMIN_V2_CAPABILITIES.filter(
  (capability) => capability !== `me.read`,
);

export const SUPER_ADMIN_CAPABILITIES: readonly AdminV2Capability[] = KNOWN_ADMIN_V2_CAPABILITIES;

export const BRIDGE_ROLE_CAPABILITIES: Readonly<Record<AdminV2BridgeRole, readonly AdminV2Capability[]>> = {
  SUPER_ADMIN: SUPER_ADMIN_CAPABILITIES,
  OPS_ADMIN: ACTIVE_ADMIN_V2_CAPABILITIES,
};

export function isKnownAdminV2Role(roleKey: string): roleKey is AdminV2Role {
  return (ADMIN_V2_SCHEMA_ROLES as readonly string[]).includes(roleKey);
}

export function resolveAdminV2BridgeRole(type: string): AdminV2BridgeRole | null {
  if (type === `SUPER`) return `SUPER_ADMIN`;
  if (type === `ADMIN`) return `OPS_ADMIN`;
  return null;
}

export function deriveAdminV2Workspaces(capabilities: readonly AdminV2Capability[]): AdminV2Workspace[] {
  const capabilitySet = new Set(capabilities);
  const workspaces = [
    ...(capabilitySet.has(`overview.read`) ? ([`overview`] as const) : []),
    ...(capabilitySet.has(`verification.read`) ? ([`verification`] as const) : []),
    ...(capabilitySet.has(`consumers.read`) ? ([`consumers`] as const) : []),
    ...(capabilitySet.has(`payments.read`) ? ([`payments`] as const) : []),
    ...(capabilitySet.has(`ledger.read`) ? ([`ledger`] as const) : []),
    ...(capabilitySet.has(`audit.read`) ? ([`audit`] as const) : []),
    ...(capabilitySet.has(`exchange.read`) ? ([`exchange`] as const) : []),
    ...(capabilitySet.has(`documents.read`) ? ([`documents`] as const) : []),
    ...(capabilitySet.has(`admins.read`) ? ([`admins`] as const) : []),
    ...(capabilitySet.has(`payment_methods.read`) ? ([`payment_methods`] as const) : []),
    ...(capabilitySet.has(`system.read`) ? ([`system`] as const) : []),
  ];
  return workspaces;
}

export function normalizeAdminV2Capabilities(capabilities: readonly string[]): AdminV2Capability[] {
  const capabilitySet = new Set(capabilities);
  return KNOWN_ADMIN_V2_CAPABILITIES.filter((capability) => capabilitySet.has(capability));
}

export function hasValidAdminV2CapabilitySet(schemaCapabilities: readonly string[]) {
  const schemaSet = new Set(schemaCapabilities);
  const knownSet = new Set<string>(KNOWN_ADMIN_V2_CAPABILITIES);

  if (schemaCapabilities.length !== schemaSet.size) {
    return false;
  }

  return schemaCapabilities.every((capability) => knownSet.has(capability));
}

export function hasBridgeCapabilityCoverage(
  schemaCapabilities: readonly string[],
  requiredBridgeCapabilities: readonly AdminV2Capability[],
) {
  if (!hasValidAdminV2CapabilitySet(schemaCapabilities)) {
    return false;
  }

  const schemaSet = new Set(schemaCapabilities);
  return requiredBridgeCapabilities.every((capability) => schemaSet.has(capability));
}

function isOverridableAdminV2Capability(capability: string): capability is AdminV2Capability {
  return (OVERRIDABLE_ADMIN_V2_CAPABILITIES as readonly string[]).includes(capability);
}

export function partitionAdminV2PermissionOverrides(overrides: readonly { capability: string; granted: boolean }[]): {
  allowed: Array<{ capability: AdminV2Capability; granted: boolean }>;
  ignored: Array<{ capability: string; granted: boolean }>;
} {
  const allowed: Array<{ capability: AdminV2Capability; granted: boolean }> = [];
  const ignored: Array<{ capability: string; granted: boolean }> = [];

  for (const override of overrides) {
    if (isOverridableAdminV2Capability(override.capability)) {
      allowed.push({ capability: override.capability, granted: override.granted });
      continue;
    }
    ignored.push(override);
  }

  return { allowed, ignored };
}

export function applyAdminV2PermissionOverrides(
  roleCapabilities: readonly string[],
  overrides: readonly { capability: string; granted: boolean }[],
): AdminV2Capability[] {
  const effectiveSet = new Set<string>(roleCapabilities);
  const { allowed } = partitionAdminV2PermissionOverrides(overrides);
  for (const override of allowed) {
    if (override.granted) {
      effectiveSet.add(override.capability);
    } else {
      effectiveSet.delete(override.capability);
    }
  }
  return normalizeAdminV2Capabilities([...effectiveSet]);
}

export function getAdminV2AccessProfile(admin: { type: string }): AdminV2AccessProfile {
  const role = resolveAdminV2BridgeRole(admin.type);
  const capabilities = role ? [...BRIDGE_ROLE_CAPABILITIES[role]] : [];
  return {
    role,
    capabilities,
    workspaces: deriveAdminV2Workspaces(capabilities),
    source: `bridge`,
  };
}

export function assertAdminV2Capability(admin: { type: string }, capability: AdminV2Capability) {
  const profile = getAdminV2AccessProfile(admin);
  if (!profile.capabilities.includes(capability)) {
    throw new ForbiddenException(`Admin is not allowed to access this Admin v2 surface`);
  }
  return profile;
}
