import type { NamespacedIdentity, NamespacedIdentityItem } from "./atom.ts";
import { ulid } from "./utils.ts";

export function identity(...args: Array<NamespacedIdentity | NamespacedIdentityItem>): NamespacedIdentity {

  const items: NamespacedIdentityItem[] = [];

  for (const item of args) {
    const withoutNs = item.replace("ns://", "");
    const parts = withoutNs.includes("/") ? withoutNs.split("/") : [withoutNs];

    for (const part of parts) {
      if (part.length === 0) {
        continue;
      }

      items.push(part);
    }
  }

  return compileIdentity("ns://" + items.join("/")) as NamespacedIdentity;
}

function compileIdentity(nsid: NamespacedIdentityItem): NamespacedIdentity {
  return nsid.replace(":ulid", ulid()) as NamespacedIdentity;
}

function sanitize(value: string) {
  return value
    .replace(/\//g, '')
    .trim();
}