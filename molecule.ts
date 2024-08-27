import { ulid } from "./ulid.ts";
import * as atom from "./atom.ts";
import {
  combine,
  identity as createIdentity,
  type NamespacedIdentity,
  type NamespacedIdentityItem,
} from "./identity.ts";
import type { AnyAtom } from "./atom.ts";
import type { CommitResultMessage, Repository } from "./repository.ts";
import { AssertionError, RuntimeError } from "./errors.ts";
import { createRepository } from "./repository.ts";
import { PrimitiveKind, PrimitiveValue } from "./primitive.ts";
import { denoRuntime, memoryRuntime } from "./runtime.ts";
import { assert } from "./assert.ts";
import type { Cell, CellCtx } from "./cell.ts";
import { cell } from "./cell.ts";

export type Molecule = {
  kind: PrimitiveKind.Molecule;
  identity: NamespacedIdentity;
  runtime: Repository;
  named: atom.MapAtom;
  loose: atom.CollectionAtom;
  version: atom.Versionstamp;
  durable(identity: string, runner: (ctx: CellCtx) => Promise<void>): Cell;
  serialize(): atom.SerializedAtomWithReferences;
  toJSON(opts?: { pretty: boolean }): object;
  string(value: string, name?: NamespacedIdentityItem): atom.StringAtom;
  number(value: number, name?: NamespacedIdentityItem): atom.NumberAtom;
  boolean(value: boolean, name?: NamespacedIdentityItem): atom.BooleanAtom;
  date(value: Date, name?: NamespacedIdentityItem): atom.DateAtom;
  object(
    value: atom.PrimitiveObject,
    name?: NamespacedIdentityItem,
  ): atom.ObjectAtom;
  list(value: atom.PrimitiveList, name?: NamespacedIdentityItem): atom.ListAtom;
  collection(
    value: atom.AtomCollection,
    name?: NamespacedIdentityItem,
  ): atom.CollectionAtom;
  map(value: atom.AtomMap, name?: NamespacedIdentityItem): atom.MapAtom;
  persist: () => Promise<CommitResultMessage[]>;
  restore: () => Promise<Molecule>;
  deserialize: (data: atom.MapAtom) => Molecule;
  setVersion: (version: string) => void;
  use<T extends Array<AnyAtom>>(...names: string[]): T;
  connect(atom: AnyAtom): void;
  defaults(defaultValues: Record<string, atom.Primitive>): Molecule;
};

// for testing purposes or empheral use
export function temporary(nsid: NamespacedIdentity): Molecule {
  return molecule(createRepository(memoryRuntime), nsid);
}

// for production purposes - with durable store
export function persistent(nsid: NamespacedIdentity): Molecule {
  return molecule(createRepository(denoRuntime), nsid);
}

// base molecule item can be used with runtime, must be named before use
export function molecule(
  runtime: Repository,
  nsid: NamespacedIdentity,
): Molecule {
  const identity = createIdentity(nsid);
  const named = atom.map({}, combine(identity, "mol", "named"));
  const loose = atom.collection([], combine(identity, "mol", "loose"));
  const create = (
    name: NamespacedIdentityItem | undefined,
    // deno-lint-ignore ban-types
    factory: Function,
    value: unknown,
    mol: Molecule,
  ) => {
    const isNamed = !!name;
    name = name || ulid.new();
    const newAtom = factory(value, combine(identity, "atoms", name), mol);
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
    durable(ident: string, callback: (ctx: CellCtx) => Promise<void>) {
      return cell(createIdentity(ident), callback, this.runtime);
    },
    defaults(schema) {
      for (const key in schema) {
        if (this.named.has(key)) {
          continue;
        } else {
          switch (typeof schema[key]) {
            case "string":
              this.named.set(key, this.string(schema[key], key));
              break;
            case "number":
              this.named.set(key, this.number(schema[key], key));
              break;
            case "boolean":
              this.named.set(key, this.boolean(schema[key], key));
              break;
            case "object":
              if (Array.isArray(schema[key])) {
                this.named.set(key, this.list(schema[key], key));
              } else if (schema[key] instanceof Date) {
                this.named.set(key, this.date(schema[key], key));
              } else if (
                typeof schema[key] === "object" && schema[key] !== null
              ) {
                this.named.set(key, this.object(schema[key], key));
              } else if (
                typeof schema[key] === "object" &&
                schema[key as string] instanceof Map
              ) {
                this.named.set(
                  key,
                  this.object(Object.fromEntries(schema[key]), key),
                );
              } else {
                throw new RuntimeError(
                  "cannot resolve object type from given value",
                );
              }
              break;
            default:
              throw new RuntimeError("type not supported in defaults()");
          }
        }
      }
      return this;
    },
    connect(atom: AnyAtom) {
      this.loose.add(atom);
    },
    setVersion(version: string) {
      this.version = version;
    },
    deserialize(data: atom.MapAtom): Molecule {
      const named = data.get("named") as atom.MapAtom;
      assert(named, "named not exists");
      this.named.mutate(named.value);

      const loose = data.get("loose") as atom.CollectionAtom;
      assert(loose, "loose not exists");
      this.loose.mutate(loose.value);

      return this;
    },
    toJSON(opts?: { pretty: boolean }): object {
      return {
        ...this.loose.toJSON(opts),
        ...this.named.toJSON(opts),
      };
    },
    serialize() {
      const serializedLoose = loose.serialize();
      const serializedNamed = named.serialize();
      return {
        ...serializedNamed,
        ...serializedLoose,
        [this.identity]: {
          version: this.version,
          value: {
            i: this.identity,
            v: {
              loose: this.loose.identity,
              named: this.named.identity,
            },
            t: PrimitiveValue.Map,
            k: this.kind,
          },
        },
      };
    },
    string(value: string, name?: NamespacedIdentityItem) {
      return create(name, atom.string, value, this);
    },
    number(value: number, name?: NamespacedIdentityItem) {
      return create(name, atom.number, value, this);
    },
    boolean(value: boolean, name?: NamespacedIdentityItem) {
      return create(name, atom.boolean, value, this);
    },
    date(value: Date, name?: NamespacedIdentityItem) {
      return create(name, atom.date, value, this);
    },
    object(value: atom.PrimitiveObject, name?: NamespacedIdentityItem) {
      return create(name, atom.object, value, this);
    },
    list(value: atom.PrimitiveList, name?: NamespacedIdentityItem) {
      return create(name, atom.list, value, this);
    },
    collection(value: atom.AtomCollection, name?: NamespacedIdentityItem) {
      return create(name, atom.collection, value, this);
    },
    map(value: atom.AtomMap, name?: NamespacedIdentityItem) {
      return create(name, atom.map, value, this);
    },
    persist(): Promise<CommitResultMessage[]> {
      return runtime.atoms.persist(this);
    },
    async restore(): Promise<Molecule> {
      const mol = await runtime.atoms.restore(this.identity);
      assert(mol, "molecule not found");
      return mol as Molecule;
    },
    use<T extends Array<AnyAtom> = Array<AnyAtom>>(...names: string[]) {
      const items: AnyAtom[] = [];

      names.forEach((name) => {
        const atom = this.named.get(name);
        if (atom) {
          items.push(atom);
        } else {
          throw new AssertionError(`No atom with name ${name}`);
        }
      });

      return items as T;
    },
  };
}
