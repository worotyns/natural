import { ulid } from "./ulid.ts";
import * as atom from "./atom.ts";
import {
  identity as createIdentity,
  type IdentityInstance,
  type IdentityItem,
} from "./identity.ts";
import type { AnyAtom } from "./atom.ts";
import type { CommitResultMessage, Repository } from "./repository.ts";
import { AssertionError } from "./errors.ts";
import { createRepository } from "./repository.ts";
import { PrimitiveKind, PrimitiveValue } from "./primitive.ts";
import { memoryRuntime } from "./runtime.ts";

export type Molecule = {
  kind: PrimitiveKind.Molecule;
  identity: IdentityInstance;
  runtime: Repository;
  named: atom.MapAtom;
  loose: atom.CollectionAtom;
  version: atom.Versionstamp;
  serialize(): atom.SerializedAtomWithReferences;
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
  persist: () => Promise<CommitResultMessage[]>;
  restore: () => Promise<Molecule>;
  use(...names: string[]): AnyAtom[];
};

// for testing purposes or empheral use
export function temporary(...name: IdentityItem[]): Molecule {
  return molecule(createRepository(memoryRuntime), ...name);
}

// for production purposes - with durable store
export function persistent(...name: IdentityItem[]): Molecule {
  // TODO: add deno kv
  return molecule(createRepository(memoryRuntime), ...name);
}

// base molecule item can be used with runtime, must be named before use
export function molecule(
  runtime: Repository,
  ...name: IdentityItem[]
): Molecule {
  const identity = createIdentity(...name);
  const named = atom.map({}, identity.child("mol", "named"));
  const loose = atom.collection([], identity.child("mol", "loose"));
  const create = (
    name: IdentityItem | undefined,
    // deno-lint-ignore ban-types
    factory: Function,
    value: unknown,
    mol: Molecule,
  ) => {
    const isNamed = !!name;
    name = name || ulid.new();
    const newAtom = factory(value, identity.child("atoms", name), mol);
    isNamed ? named.set(name, newAtom) : loose.add(newAtom);
    return newAtom;
  };

  return {
    kind: PrimitiveKind.Molecule,
    identity,
    runtime,
    loose,
    named,
    version: "",
    serialize() {
      const serializedLoose = loose.serialize();
      const serializedNamed = named.serialize();
      return {
        ...serializedLoose,
        ...serializedNamed,
        [this.identity.serialize()]: {
          i: this.identity.serialize(),
          v: {
            loose: this.loose.identity.serialize(),
            named: this.named.identity.serialize(),
          },
          t: PrimitiveValue.Map,
          k: this.kind,
        },
      };
    },
    string(value: string, name?: IdentityItem) {
      return create(name, atom.string, value, this);
    },
    number(value: number, name?: IdentityItem) {
      return create(name, atom.number, value, this);
    },
    boolean(value: boolean, name?: IdentityItem) {
      return create(name, atom.boolean, value, this);
    },
    date(value: Date, name?: IdentityItem) {
      return create(name, atom.date, value, this);
    },
    list(value: atom.PrimitiveList, name?: IdentityItem) {
      return create(name, atom.list, value, this);
    },
    collection(value: atom.AtomCollection, name?: IdentityItem) {
      return create(name, atom.collection, value, this);
    },
    map(value: atom.AtomMap, name?: IdentityItem) {
      return create(name, atom.map, value, this);
    },
    persist(): Promise<CommitResultMessage[]> {
      return runtime.atoms.persist(this);
    },
    async restore(): Promise<Molecule> {
      // TODO :FIX
      const mol = await runtime.atoms.restore(this.identity);
      return molecule(runtime, ...identity.key);
    },
    use(...names: string[]) {
      const items: AnyAtom[] = [];
      names.forEach((name) => {
        const atom = this.named.get(name);
        if (atom) {
          items.push(atom);
        } else {
          throw new AssertionError(`No atom with name ${name}`);
        }
      });
      return items;
    },
  };
}
