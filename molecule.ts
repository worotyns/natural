import { AssertionError, RuntimeError } from "./errors.ts";
import { assert } from "./utils.ts";
import type { AnyAtom } from "./atom.ts";
import type { Identity } from "./identifier.ts";
import { combine } from "./identifier.ts";

export type Molecule = {
  identity: Identity;
  atoms: AnyAtom[];
  version: string;
  isPartialyRestored: boolean;
  wasPersisted: boolean;
  // deno-lint-ignore no-explicit-any
  serialize(): Record<string, any>;
  use(...names: string[]): AnyAtom[];
  wasModified(): boolean;
  mutate(mutator: (ctx: Molecule) => Promise<void>): Promise<void>;
};

type MoleculeOptions = {
  // mark as partialy restored, then perialy store only atoms, not molecule
  restoredPartialy?: boolean;
  // when restoring atoms from store, do not wrap identities
  omitWrapingIdentities?: boolean;
};

export const molecule = (
  identity: Identity,
  atoms: AnyAtom[],
  version: string = "",
  opts: MoleculeOptions = {},
): Molecule => {
  return {
    identity: identity,
    version: version,
    atoms: opts.omitWrapingIdentities ? atoms : atoms.map((atm) => {
      atm.identity = combine(identity, atm.identity);
      return atm;
    }),
    isPartialyRestored: opts.restoredPartialy || false,
    wasPersisted: false,
    serialize() {
      return atoms.reduce((res, atom) => {
        res[atom.name] = atom.value;
        return res;
      }, {} as Record<string, unknown>);
    },
    use(...names: string[]) {
      if (this.wasPersisted) {
        throw new RuntimeError(
          "Cannot use .use method after persisting atoms - please restore molecule again.",
        );
      }
      const items: AnyAtom[] = [];
      names.forEach((name) => {
        const atom = atoms.find((atom) => {
          return atom.name === name;
        });
        assert(atom, AssertionError.format("atom not found by name %s", name));
        items.push(atom);
      });
      assert(
        items.length === names.length,
        new AssertionError("molecule not resolve all atoms"),
      );
      return items;
    },
    wasModified() {
      return atoms.some((atom) => atom.wasModified());
    },
    async mutate(mutator: (ctx: Molecule) => Promise<void>): Promise<void> {
      await mutator(this);
    },
  };
};

export const isMolecule = (item: unknown): item is Molecule => {
  return typeof item === "object" && item !== null && "identity" in item &&
    "atoms" in item;
};
