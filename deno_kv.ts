import { AssertionError } from "./errors.ts";
import { type AnyAtom, atom, isAtom } from "./atom.ts";
import { type Identity, serialize } from "./identifier.ts";
import { isMolecule, type Molecule, molecule } from "./molecule.ts";
import type { ActivityRepo, NaturalRepo } from "./runtime.ts";
import type { AnyActivity, AnyActivityData } from "./activity.ts";
import { assert, type Ulid } from "./utils.ts";

type StoredItem = { t: number; v: unknown };

enum ObjectType {
  atom = 1,
  molecule = 2,
}

const db = await Deno.openKv();

const restore = async <T = unknown>(
  identifier: Identity,
): Promise<T | null> => {
  const item = await db.get<StoredItem>(identifier);

  if (!item.value) {
    return null;
  }

  const { t, v } = item.value;

  switch (t) {
    case ObjectType.atom:
      return atom(serialize(identifier), v, item.versionstamp) as T | null;
    case ObjectType.molecule:
      return molecule(
        identifier,
        Object.keys(v as object).map((key) =>
          atom(key, (v as Record<string, unknown>)[key])
        ),
        item.versionstamp,
      ) as T | null;
    default:
      throw new AssertionError("Unknown type");
  }
};

const toAtomicCheck = (item: AnyAtom | Molecule): Deno.AtomicCheck => {
  return {
    key: item.identity,
    versionstamp: item.version,
  };
};

const persist = async (...items: Array<AnyAtom | Molecule>) => {
  const transaction = db.atomic();

  items.forEach((item) => {
    if (isAtom(item)) {
      if (item.version) {
        transaction.check(toAtomicCheck(item));
      }
      transaction.set(item.identity, {
        t: ObjectType.atom,
        v: item.value,
      });
    } else if (isMolecule(item)) {
      if (item.version) {
        transaction.check(toAtomicCheck(item));
      }
      transaction.set(item.identity, {
        t: ObjectType.molecule,
        v: item.serialize(),
      });
    } else {
      throw new AssertionError("Unknown type");
    }
  });

  await transaction.commit();
};

type NaturalRepoHelpers = {
  clear: () => Promise<void>;
  dump: () => Promise<void>;
};

export const denokv: NaturalRepo & NaturalRepoHelpers = {
  restore,
  persist,
  async clear() {
    for await (const item of db.list({ prefix: [] })) {
      await db.delete(item.key);
    }
  },
  async dump() {
    for await (const item of db.list({ prefix: [] })) {
      console.log(item);
    }
  },
};

const add = async (...items: Array<AnyActivity>) => {
  for (const item of items) {
    await db.set(item.identity, item.value);
  }
};

const scan = async (rawUlid: Ulid | Identity) => {
  const activity: AnyActivityData[] = [];
  const startFrom = Array.isArray(rawUlid) ? rawUlid.at(1)! : rawUlid;
  assert(startFrom, "startFrom is not defined");

  for await (
    const item of db.list<AnyActivityData>({
      prefix: ["activity"],
      start: ["activity", startFrom],
    })
  ) {
    activity.push({
      k: item.value.k,
      t: item.value.t,
      v: item.value.v,
    });
  }

  return activity;
};

export const denokv_activity: ActivityRepo & NaturalRepoHelpers = {
  add,
  scan,
  async clear() {
    for await (const item of db.list({ prefix: [] })) {
      await db.delete(item.key);
    }
  },
  async dump() {
    for await (const item of db.list({ prefix: [] })) {
      console.log(item);
    }
  },
};
