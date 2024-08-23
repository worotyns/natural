import {
  deserialize,
  identity,
  type IdentityInstance,
  type IdentityItem,
} from "./identity.ts";
import { PrimitiveKind, PrimitiveValue } from "./primitive.ts";
import * as atom from "./atom.ts";
import type { AnyActivity, AnyActivityData } from "./activity.ts";
import type { Ulid } from "./ulid.ts";
import { type Molecule, molecule } from "./molecule.ts";
import type { Runtime } from "./runtime.ts";
import { assert } from "./assert.ts";
import { RuntimeError } from "./errors.ts";
import { ulid } from "./ulid.ts";

export type IdentifiableAndValuedOfAndKindPrimitive = {
  kind: PrimitiveKind;
  identity: IdentityInstance;
  serialize: () => atom.SerializedAtom;
};

export type NaturalRepo = {
  persist: (
    ...items: Array<atom.AnyAtom | Molecule>
  ) => Promise<CommitResultMessage[]>;
  restore: <T = unknown>(
    identifier: IdentityInstance,
    partialAtoms?: IdentityItem[],
  ) => Promise<T | null>;
};

export type ActivityRepo = {
  add: (...items: Array<AnyActivity>) => Promise<void>;
  scan: (lastUlid: Ulid | IdentityInstance) => Promise<AnyActivityData[]>;
};

export type Repository = {
  atoms: NaturalRepo;
  log: ActivityRepo;
};

export type CommitResultMessage = { status: boolean; versionstamp: string };

export function createRepository(runtime: Runtime): Repository {
  const add = async (...items: Array<AnyActivity>) => {
    for (const item of items) {
      await runtime.set({
        key: item.identity.serialize(),
        val: item.value,
        ver: ulid.new(),
      });
    }
  };

  const scan = async (rawUlid: Ulid | IdentityInstance) => {
    const activity: AnyActivityData[] = [];
    const startFrom = Array.isArray(rawUlid) ? rawUlid.at(1)! : rawUlid;
    assert(startFrom, "startFrom is not defined");

    for (
      const item of await runtime.scan<AnyActivityData>(
        identity("activity"),
        identity(
          "activity",
          startFrom,
        ),
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
          item.version = ulid.new();

          for (const [key, value] of Object.entries(item.serialize())) {
            await runtime.set({
              key: key,
              val: value,
              ver: ulid.new(),
            });
          }

          break;
        case PrimitiveKind.Atom:
          commitMsgs.push({
            status: true,
            versionstamp: ulid.new(),
          });

          for (const [key, value] of Object.entries(item.serialize())) {
            await runtime.set({
              key: key,
              val: value,
              ver: ulid.new(),
            });
          }

          break;
      }
    }

    return commitMsgs;
  };

  const restore = async (identityToRestore: IdentityInstance) => {
    const restoreSingleAtom = async (
      item: atom.SerializedAtom,
      mol: Molecule,
    ) => {
      switch (item.t) {
        case PrimitiveValue.Boolean: {
        }
        case PrimitiveValue.Number:
        case PrimitiveValue.String:
        case PrimitiveValue.List:
        case PrimitiveValue.Date:
        case PrimitiveValue.Object:
        case PrimitiveValue.Map: {
          const temporaryMap = mol
            ? mol.map({})
            : atom.map({}, identity(...item.i)); //.restore()
          ///????;

          for (const [key, ident] of Object.entries(item.v)) {
            console.log({key, ident});
            const mapItem = await runtime.get<atom.SerializedAtom>(
              deserialize(ident),
            );
            temporaryMap.set(
              key,
              await restoreSingleAtom(mapItem.val, mol) as atom.AnyAtom,
            );
          }
          return temporaryMap;
        }
        case PrimitiveValue.Collection:
          break;
        default:
          throw new Error("Wtf");
      }
    };

    const restoreUnknown = async (item: atom.SerializedAtom) => {
      switch (item.k) {
        case PrimitiveKind.Identity:
          throw new RuntimeError("identity not supported in serialization");
        case PrimitiveKind.Atom:
          console.log("item", item);
          break;
        case PrimitiveKind.Molecule: {
          const mol = molecule(createRepository(runtime));
          const molMap = await restoreSingleAtom(item, mol);
          return mol.deserialize(molMap as any) as any;
        }
        case PrimitiveKind.Cell:
          throw new RuntimeError("not implemented");
      }
    };

    const item = await runtime.get<atom.SerializedAtom>(identityToRestore);
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
