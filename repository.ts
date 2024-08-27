import {
  combine,
  identity,
  type NamespacedIdentity,
  type NamespacedIdentityItem,
} from "./identity.ts";
import { PrimitiveKind, PrimitiveValue } from "./primitive.ts";
import * as atom from "./atom.ts";
import type { AnyActivity, AnyActivityData } from "./activity.ts";
import type { Ulid } from "./ulid.ts";
import { type Molecule, molecule } from "./molecule.ts";
import type { Runtime } from "./runtime.ts";
import { assert } from "./assert.ts";
import { RuntimeError } from "./errors.ts";

export type IdentifiableAndValuedOfAndKindPrimitive = {
  kind: PrimitiveKind;
  identity: NamespacedIdentity;
  serialize: () => atom.SerializedAtom;
};

export type NaturalRepo = {
  persist: (
    ...items: Array<atom.AnyAtom | Molecule>
  ) => Promise<CommitResultMessage[]>;
  restore: <T = unknown>(
    identifier: NamespacedIdentity,
    partialAtoms?: NamespacedIdentityItem[],
  ) => Promise<T | null>;
};

export type ActivityRepo = {
  add: (...items: Array<AnyActivity>) => Promise<void>;
  scan: (lastUlid: Ulid | NamespacedIdentity) => Promise<AnyActivityData[]>;
};

export type Repository = {
  atoms: NaturalRepo;
  log: ActivityRepo;
};

export type CommitResultMessage = { status: boolean; versionstamp: string };

export type PersistedAtom = atom.SerializedAtom["value"];

export function createRepository(runtime: Runtime): Repository {
  // append only version does not matter
  const add = async (...items: Array<AnyActivity>) => {
    for (const item of items) {
      await runtime.set({
        key: item.identity,
        val: item.value,
        ver: "",
      });
    }
  };

  const scan = async (rawUlid: Ulid | NamespacedIdentity) => {
    const activity: AnyActivityData[] = [];
    assert(rawUlid, "startFrom is not defined");

    const prefix = identity("activity");
    const startFrom = rawUlid.startsWith("ns://")
      ? rawUlid as NamespacedIdentity
      : combine(prefix, rawUlid);

    for (
      const item of await runtime.scan<AnyActivityData>(
        prefix,
        startFrom,
        100,
      )
    ) {
      activity.push(item);
    }

    return activity;
  };

  const persist = async (...items: Array<atom.AnyAtom | Molecule>) => {
    const commitMsgs: CommitResultMessage[] = [];

    for (const item of items) {
      switch (item.kind) {
        case PrimitiveKind.Molecule:
          for (const [key, value] of Object.entries(item.serialize())) {
            await runtime.set({
              key: key as NamespacedIdentity,
              val: value.value,
              ver: value.version,
            });
          }

          break;
        case PrimitiveKind.Atom:
          for (const [key, value] of Object.entries(item.serialize())) {
            const [result] = await runtime.set({
              key: key as NamespacedIdentity,
              val: value.value,
              ver: value.version,
            });
            commitMsgs.push(result);
          }

          break;
      }
    }

    return commitMsgs;
  };

  const restore = async <T = unknown>(
    identityToRestore: NamespacedIdentity,
  ) => {
    const restoreSingleAtom = async (
      item: PersistedAtom,
      mol?: Molecule,
    ) => {
      switch (item.t) {
        case PrimitiveValue.Boolean:
          return atom.boolean(item.v as boolean, item.i, mol);
        case PrimitiveValue.Number:
          return atom.number(item.v as number, item.i, mol);
        case PrimitiveValue.String:
          return atom.string(item.v as string, item.i, mol);
        case PrimitiveValue.List:
          return atom.list(
            item.v as atom.PrimitiveList,
            item.i,
            mol,
          );
        case PrimitiveValue.Date:
          return atom.date(
            new Date(item.v as number),
            item.i,
            mol,
          );
        case PrimitiveValue.Object:
          return atom.object(
            item.v as atom.PrimitiveObject,
            item.i,
            mol,
          );
        case PrimitiveValue.Map: {
          const temporaryMap = atom.map({}, item.i, mol);

          for (const [key, ident] of Object.entries(item.v)) {
            const mapItem = await runtime.get<PersistedAtom>(
              ident,
            );

            if (!mapItem) {
              console.warn("item not found: ", ident);
              continue;
            }

            temporaryMap.set(
              key,
              await restoreSingleAtom(mapItem.val, mol) as atom.AnyAtom,
            );
          }
          return temporaryMap;
        }
        case PrimitiveValue.Collection: {
          const temporaryCollection = atom.collection(
            [],
            item.i,
            mol,
          );

          for (const ident of item.v as NamespacedIdentity[]) {
            const collItem = await runtime.get<PersistedAtom>(
              ident,
            );

            if (!collItem) {
              console.warn("item not found: ", ident);
              continue;
            }

            temporaryCollection.add(
              await restoreSingleAtom(collItem.val, mol) as atom.AnyAtom,
            );
          }

          return temporaryCollection;
        }
        default:
          throw new Error("not supported kind of primitive");
      }
    };

    const restoreUnknown = async (item: PersistedAtom) => {
      if (!item) {
        return null;
      }
      switch (item.k) {
        case PrimitiveKind.Identity:
          throw new RuntimeError("identity not supported in serialization");
        case PrimitiveKind.Atom:
          return await restoreSingleAtom(item) as T;
        case PrimitiveKind.Molecule: {
          const mol = molecule(
            createRepository(runtime),
            item.i,
          );
          const molMap = await restoreSingleAtom(item, mol);
          return mol.deserialize(molMap as atom.MapAtom) as T;
        }
        case PrimitiveKind.Cell:
          throw new RuntimeError("not implemented");
        default:
          return null;
      }
    };

    const item = await runtime.get<PersistedAtom>(identityToRestore);

    if (!item) {
      return null;
    }

    return restoreUnknown(item.val);
  };

  return {
    atoms: {
      persist,
      restore,
    },
    log: {
      add,
      scan,
    },
  };
}
