export const UserRole = {
  CLIENT: `client`,
  ADMIN: `admin`,
  SUPERADMIN: `superadmin`,
} as const;
export const UserRoles = Object.values(UserRole);
export type IUserRole = (typeof UserRole)[keyof typeof UserRole];
