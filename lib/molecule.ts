import { ulid } from "./ulid.ts";
import * as atom from "./atom.ts";
import {
  identity as createIdentity,
  type IdentityInstance,
  type IdentityItem,
} from "./identity.ts";
import type { AnyAtom } from "./atom.ts";
import type { CommitResultMessage, Runtime } from "./repository.ts";
import { AssertionError } from "./errors.ts";
import { createMemory } from "./memory.ts";

export type Molecule = {
  identity: IdentityInstance;
  runtime: Runtime;
  named: atom.MapAtom;
  loose: atom.CollectionAtom;
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
  restore: (identity: IdentityInstance) => Promise<Molecule>;
  use(...names: string[]): AnyAtom[];
};

// for testing purposes
export function stateless(...name: IdentityItem[]): Molecule {
  return molecule(createMemory(), ...name);
}

// for production purposes
export function statefull(...name: IdentityItem[]): Molecule {
  // TODO: add deno kv
  return molecule(createMemory(), ...name);
}

// base molecule item
export function molecule(runtime: Runtime, ...name: IdentityItem[]): Molecule {
  const identity = createIdentity(...name);
  return {
    identity,
    runtime,
    named: atom.map({}, identity.child("named")),
    loose: atom.collection([], identity.child("loose")),
    string(value: string, name: IdentityItem = ulid.new()) {
      const newAtom = atom.string(value, identity.child(name));
      // atoms.(newAtom);
      return newAtom;
    },
    number(value: number, name: IdentityItem = ulid.new()) {
      const newAtom = atom.number(value, identity.child(name));
      // atoms.push(newAtom);
      return newAtom;
    },
    boolean(value: boolean, name: IdentityItem = ulid.new()) {
      const newAtom = atom.boolean(value, identity.child(name));
      // atoms.push(newAtom);
      return newAtom;
    },
    date(value: Date, name: IdentityItem = ulid.new()) {
      const newAtom = atom.date(value, identity.child(name));
      // atoms.push(newAtom);
      return newAtom;
    },
    list(value: atom.PrimitiveList, name: IdentityItem = ulid.new()) {
      const newAtom = atom.list(value, identity.child(name));
      // atoms.push(newAtom);
      return newAtom;
    },
    collection(value: atom.AtomCollection, name: IdentityItem = ulid.new()) {
      const newAtom = atom.collection(value, identity.child(name));
      // atoms.push(newAtom);
      return newAtom;
    },
    map(value: atom.AtomMap, name: IdentityItem = ulid.new()) {
      const newAtom = atom.map(value, identity.child(name), this);
      // atoms.push(newAtom);
      return newAtom;
    },
    async persist(...items: AnyAtom[]): Promise<CommitResultMessage[]> {
      return runtime.repository.persist(this);
    },
    async restore(identity: IdentityInstance) {
      throw new Error("not implementd");
      // return molecule(runtime, ...identity.key);
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

// for production purposes based on deno kv
// export function durable() {

// }
