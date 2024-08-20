import { assert } from "./utils.ts";

// Function to check if a specific role has permission
export function has(permissions: number, role: number) {
  return (permissions & role) !== 0;
}

// Function to grant a specific role permission
export function grant(permissions: number, role: number) {
  return permissions | role;
}

// Function to revoke a specific role permission
export function revoke(permissions: number, role: number) {
  return permissions & ~role;
}

export function or(
  permission: number,
  ...roles: (number | boolean)[]
): boolean {
  for (const role of roles) {
    if (typeof role === "number") {
      if (has(permission, role)) {
        return true;
      }
    } else if (typeof role === "boolean") {
      return role;
    }
  }
  return false;
}

export function and(
  permission: number,
  ...roles: (number | boolean)[]
): boolean {
  for (const role of roles) {
    if (typeof role === "number") {
      if (!has(permission, role)) {
        return false;
      }
    } else if (typeof role === "boolean") {
      return role;
    }
  }
  return true;
}

export function combine(...roles: number[]): number {
  return roles.reduce((a, b) => a | b);
}

export function flags<T>(definitions: T): Map<T[keyof T], number> {
  assert(Array.isArray(definitions), "Definitions must be an array");
  assert(
    definitions.length < 32,
    "Cannot define more than max integer safe permissions",
  );

  const flags = new Map<T[keyof T], number>();

  for (let i = 0; i < definitions.length; i++) {
    flags.set(definitions[i], 1 << i);
  }

  return flags;
}
