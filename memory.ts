import { AssertionError } from "./errors.ts";
import { type AnyAtom, atom, isAtom } from "./atom.ts";
import { deserialize, type Identity, serialize } from "./identifier.ts";
import { isMolecule, type Molecule, molecule } from "./molecule.ts";
import type { NaturalRepo } from "./runtime.ts";

type StoredItem = { t: number; v: unknown };

const store: Map<string, StoredItem> = new Map();

enum ObjectType {
  atom = 1,
  molecule = 2,
}

// deno-lint-ignore require-await
const restore = async <T = unknown>(identifier: Identity) => {
  const serialized = serialize(identifier);
  if (!store.has(serialized)) {
    return null;
  }

  const { t, v } = store.get(serialized)!;

  switch (t) {
    case ObjectType.atom:
      return atom(serialized, v) as T | null;
    case ObjectType.molecule:
      return molecule(
        deserialize(serialized),
        Object.keys(v as object).map((key) =>
          atom(key, (v as Record<string, unknown>)[key])
        ),
      ) as T | null;
    default:
      throw new AssertionError("Unknown type");
  }
};

// deno-lint-ignore require-await
const persist = async (...items: Array<AnyAtom | Molecule>) => {
  items.forEach((item) => {
    if (isAtom(item)) {
      store.set(item.name, {
        t: ObjectType.atom,
        v: item.value,
      });
    } else if (isMolecule(item)) {
      store.set(serialize(item.identity), {
        t: ObjectType.molecule,
        v: item.serialize(),
      });
    } else {
      throw new AssertionError("Unknown type");
    }
  });
};

export const memory: NaturalRepo & { store: Map<string, StoredItem> } = {
  restore,
  persist,
  store,
};
