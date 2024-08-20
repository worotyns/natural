import { AssertionError } from "./errors.ts";
import { type AnyAtom, atom, isAtom } from "./atom.ts";
import { type Identity, serialize } from "./identifier.ts";
import { isMolecule, type Molecule, molecule } from "./molecule.ts";

type StoredItem = { t: number; v: unknown };

enum ObjectType {
  atom = 1,
  molecule = 2,
}

const db = await Deno.openKv();

const restore = async <T = unknown>(identifier: Identity) => {
  const item = await db.get<StoredItem>(identifier);

  if (!item.value) {
    return null;
  }

  const { t, v } = item.value;

  switch (t) {
    case ObjectType.atom:
      return atom(serialize(identifier), v) as T | null;
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
      transaction.set([item.name], {
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

export const denokv = {
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
