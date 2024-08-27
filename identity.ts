export type NamespacedIdentityItem = string;
export type NamespacedIdentity = `ns://${NamespacedIdentityItem}`;

// Create new identity
export const identity = (
  ...identityItems: NamespacedIdentityItem[]
): NamespacedIdentity => {
  const items: NamespacedIdentityItem[] = [];

  for (const item of identityItems) {
    const withoutNs = item.replace("ns://", "");
    const parts = withoutNs.includes("/") ? withoutNs.split("/") : [withoutNs];

    for (const part of parts) {
      if (part.length === 0) {
        continue;
      }

      items.push(part.replace(/\//g, ""));
    }
  }

  return "ns://" + items.join("/") as NamespacedIdentity;
};

// Combine arrays of identities (helper for child creation)
export const combine = (
  oldIdentity: NamespacedIdentity,
  ...identityItems: NamespacedIdentityItem[]
): NamespacedIdentity => {
  if (identityItems.length === 0) {
    return oldIdentity;
  }

  const [_ns, path] = oldIdentity.split("://");
  return `ns://${path}/${identityItems.join("/")}`;
};
