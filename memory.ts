import { AssertionError, RuntimeError } from "./errors.ts";
import { type AnyAtom, atom, isAtom } from "./atom.ts";
import {
  combine,
  deserialize,
  type Identity,
  type IdentityItem,
  serialize,
} from "./identifier.ts";
import { isMolecule, type Molecule, molecule } from "./molecule.ts";
import type { ActivityRepo, NaturalRepo } from "./runtime.ts";
import { assert, type Ulid, ulid } from "./utils.ts";
import type { AnyActivity, AnyActivityData } from "./activity.ts";

type StoredItem = { t: number; v: unknown };

const store: Map<
  string,
  { metadata: { versionstamp: string }; value: StoredItem }
> = new Map();

enum ObjectType {
  atom = 1,
  molecule = 2,
}

const restore = async <T = unknown>(
  identifier: Identity,
  partialAtoms?: Array<IdentityItem>,
) => {
  // const itemsToFilter = (partialAtoms || [] as Array<IdentityItem>).map(partial => serialize(combine(identifier, partial)));
  const itemsToFilter = partialAtoms || [] as Array<IdentityItem>;

  const restoreSingle = async (identifier: Identity): Promise<T | null> => {
    const serialized = serialize(identifier);

    if (!store.has(serialized)) {
      return null;
    }

    const { metadata: { versionstamp }, value: { t, v } } = store.get(
      serialized,
    )!;

    switch (t) {
      case ObjectType.atom:
        return atom(identifier, v, versionstamp) as T | null;
      case ObjectType.molecule:
        return molecule(
          deserialize(serialized),
          await Promise.all(
            (v as IdentityItem[])
              .filter((ident: IdentityItem) => {
                return itemsToFilter.length > 0
                  ? itemsToFilter.includes(ident)
                  : true;
              })
              .map((ident: IdentityItem) => {
                return restoreSingle(combine(identifier, ident)) as Promise<
                  AnyAtom
                >;
              }),
          ),
          versionstamp,
          {
            restoredPartialy: partialAtoms ? partialAtoms.length > 0 : false,
            omitWrapingIdentities: true,
          },
        ) as T | null;
      default:
        throw new AssertionError("Unknown type");
    }
  };

  return await restoreSingle(identifier);
};

const persist = async (...items: Array<AnyAtom | Molecule>) => {
  const persistSingle = async (item: AnyAtom | Molecule) => {
    if (isAtom(item)) {
      if (item.wasPersisted) {
        throw new RuntimeError(
          "Cannot persist once persisted molecule, restore first and then persist again",
        );
      }

      if (isAtom(item.value)) {
        if (Array.isArray(item.value)) {
          item.value = await Promise.all(item.value.map(persistSingle));
          return item.name;
        } else {
          item.value = await persistSingle(item.value);
          return item.name;
        }
      } else {
        item.wasPersisted = true;
        store.set(serialize(item.identity), {
          metadata: {
            versionstamp: ulid.fromTime(Date.now()),
          },
          value: {
            t: ObjectType.atom,
            v: item.value,
          },
        });
        return item.name;
      }
    } else if (isMolecule(item)) {
      if (item.wasPersisted) {
        throw new RuntimeError(
          "Cannot persist once persisted molecule, restore first and then persist again",
        );
      }

      if (item.isPartialyRestored) {
        item.wasPersisted = true;
        await Promise.all(item.atoms.map(persistSingle));
        return;
      }

      item.wasPersisted = true;

      store.set(serialize(item.identity), {
        metadata: {
          versionstamp: ulid.fromTime(Date.now()),
        },
        value: {
          t: ObjectType.molecule,
          v: await Promise.all(item.atoms.map(persistSingle)),
        },
      });
    } else {
      throw new AssertionError("Unknown type");
    }
  };

  for (const item of items) {
    await persistSingle(item);
  }
};

export const memory: NaturalRepo & {
  store: Map<string, { metadata: { versionstamp: string }; value: StoredItem }>;
} = {
  restore,
  persist,
  store,
};

const activityStore: Set<AnyActivity> = new Set<AnyActivity>();

const add = async (...items: Array<AnyActivity>) => {
  for (const item of items) {
    await activityStore.add(item);
  }
};

// deno-lint-ignore require-await
const scan = async (rawUlid: Ulid | Identity) => {
  const activity: AnyActivityData[] = [];
  const startFrom = Array.isArray(rawUlid) ? rawUlid.at(1)! : rawUlid;
  assert(startFrom, "startFrom is not defined");

  for (const item of activityStore) {
    if (item.identity.at(1)!.localeCompare(startFrom) >= 0) {
      activity.push({
        k: item.value.k,
        t: item.value.t,
        v: item.value.v,
      });
    }
  }

  return activity;
};

export const memory_activity: ActivityRepo & { store: Set<AnyActivity> } = {
  add,
  scan,
  store: activityStore,
};
