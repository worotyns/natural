import { ulid } from "../utils.ts";
import * as atom from "./atom.ts";
import type { IdentityInstance, IdentityItem } from "./identity.ts";
import type { PrimitiveKind } from "./primitive.ts";

type IdentifiableAndValuedOfAndKindPrimitive = {
  kind: PrimitiveKind;
  identity: IdentityInstance;
  serialize: () => unknown;
};

type CommitResultMessage = { status: boolean; versionstamp: string };

export type Organism = {
  identity: IdentityInstance;
  string(value: string, name?: IdentityItem): atom.StringAtom;
  number(value: number, name?: IdentityItem): atom.NumberAtom;
  boolean(value: boolean, name?: IdentityItem): atom.BooleanAtom;
  date(value: Date, name?: IdentityItem): atom.DateAtom;
  list(value: atom.PrimitiveList, name?: IdentityItem): atom.ListAtom;
  collection(
    value: atom.AtomCollection,
    name?: IdentityItem,
  ): atom.CollectionAtom;
  map(value: atom.AtomMap, name?: IdentityItem): atom.MapAtom;
  repository: {
    persist: (
      ...items: IdentifiableAndValuedOfAndKindPrimitive[]
    ) => Promise<CommitResultMessage[]>;
    archive: (
      ...items: IdentifiableAndValuedOfAndKindPrimitive[]
    ) => Promise<CommitResultMessage[]>;
    restore: <T = unknown>(
      identifier: IdentityInstance,
      partialAtoms?: IdentityItem[],
    ) => Promise<T | null>;
  };
};

// for testing purposes
export function memory(identity: IdentityInstance): Organism {
  const memoryRepository = new Map();

  return {
    identity: identity,
    string(value: string, name: IdentityItem = ulid.new()) {
      return atom.string(value, identity.child(name));
    },
    number(value: number, name: IdentityItem = ulid.new()) {
      return atom.number(value, identity.child(name));
    },
    boolean(value: boolean, name: IdentityItem = ulid.new()) {
      return atom.boolean(value, identity.child(name));
    },
    date(value: Date, name: IdentityItem = ulid.new()) {
      return atom.date(value, identity.child(name));
    },
    list(value: atom.PrimitiveList, name: IdentityItem = ulid.new()) {
      return atom.list(value, identity.child(name));
    },
    collection(value: atom.AtomCollection, name: IdentityItem = ulid.new()) {
      return atom.collection(value, identity.child(name));
    },
    map(value: atom.AtomMap, name: IdentityItem = ulid.new()) {
      return atom.map(value, identity.child(name), this);
    },
    repository: {
      async restore<T = unknown>(
        identifier: IdentityInstance,
        partialAtoms?: IdentityItem[],
      ): Promise<T | null> {
        return null;
      },
      async persist(
        ...items: IdentifiableAndValuedOfAndKindPrimitive[]
      ): Promise<CommitResultMessage[]> {
        for (const item of items) {
          memoryRepository.set(item.identity.serialize(), item.serialize());
        }

        return [];
      },
      async archive(
        ...items: IdentifiableAndValuedOfAndKindPrimitive[]
      ): Promise<CommitResultMessage[]> {
        for (const item of items) {
          memoryRepository.set(item.identity.serialize(), item.serialize());
        }

        return [];
      },
    },
  };
}

// for production purposes based on deno kv
// export function durable() {

// }
