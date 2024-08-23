import { AssertionError } from "./errors.ts";
import { PrimitiveKind } from "./primitive.ts";

export type IdentitySerialized = string;
export type IdentityItem = string;

// identity identifies atoms, molecules
export type Identity = {
  kind: PrimitiveKind.Identity;
  // each identity is an array of strings
  key: IdentityItem[];
};

export type IdentityHelpers = {
  equals: (toEqual: Identity) => boolean;
  clone: () => IdentityInstance;
  child: (...identityItems: IdentityItem[]) => IdentityInstance;
  compact: (identity: Identity) => IdentityInstance;
  serialize: () => IdentitySerialized;
  [Symbol.iterator](): Generator<IdentityItem>;
};

export type IdentityInstance = Identity & IdentityHelpers;

export function identity(...items: IdentityItem[]): IdentityInstance {
  return {
    *[Symbol.iterator]() {
      for (const item of this.key) {
        yield item;
      }
    },
    key: items,
    kind: PrimitiveKind.Identity,
    equals(toEqual: Identity) {
      return equal(this, toEqual);
    },
    clone() {
      return identity(...clone(this).key);
    },
    child(...identityItems: IdentityItem[]) {
      return identity(...combine(this, ...identityItems).key);
    },
    serialize() {
      return serialize(this);
    },
    compact(otherIdent: Identity): IdentityInstance {
      return identity(...compact(this, otherIdent).key);
    },
  };
}

// Equals an two identities
export const equal = (source: Identity, toEqual: Identity): boolean => {
  return source.kind === toEqual.kind &&
    source.key.join("") === toEqual.key.join("");
};

// Clone an identity as new instance to prevent mutations
export const clone = (identity: Identity): Identity => {
  return { kind: identity.kind, key: [...identity.key] };
};

// Combine arrays of identities (helper for child creation)
export const combine = (
  oldIdentity: Identity,
  ...identityItems: IdentityItem[]
): Identity => {
  return identity(...oldIdentity.key, ...identityItems);
};

// Removes common part of identity keys - for storing molecules children
export const compact = (
  origin: Identity,
  toCompact: Identity,
): Identity => {
  const compactedKey: IdentityItem[] = [];

  for (let i = 0; i < toCompact.key.length; i++) {
    const originKey = origin.key[i];
    const toCompactKey = toCompact.key[i];

    if (originKey === toCompactKey) {
      continue;
    } else if (originKey === undefined) {
      compactedKey.push(toCompactKey);
    } else if (toCompactKey === undefined) {
      compactedKey.push(originKey);
    } else {
      throw new AssertionError("Cannot compact - identity keys are not equal");
    }
  }

  return identity(...compactedKey);
};

// Check if an item is an identity or serialized identity
export const isIdentity = (
  item: unknown,
): item is Identity | IdentitySerialized | IdentityInstance => {
  return isSerializedIdentity(item) || isInstanceOfIdentity(item);
};

// Check if an item is a serialized identity
const isSerializedIdentity = (item: unknown): item is IdentitySerialized => {
  return typeof item === "string" && item.startsWith("identity::");
};

// Check if an item is an identity
const isInstanceOfIdentity = (item: unknown): item is IdentityInstance => {
  return isDeserializedIdentity(item) && "clone" in item;
};

// Check if an item is a deserialized identity
const isDeserializedIdentity = (item: unknown): item is Identity => {
  return typeof item === "object" && item !== null &&
    "kind" in item &&
    "key" in item &&
    item.kind === PrimitiveKind.Identity;
};

// Serialize to string
export const serialize = (identity: Identity): IdentitySerialized => {
  return "identity::" + identity.key.join(":");
};

// Deserialize from string
export const deserialize = (
  rawIdentity: IdentitySerialized,
): IdentityInstance => {
  if (!isSerializedIdentity(rawIdentity)) {
    throw new AssertionError("Not an identity");
  }

  const [_, key] = rawIdentity.split("identity::");
  return identity(...key.split(":"));
};
