import { AssertionError } from "./errors.ts";
import { assert } from "./utils.ts";
import type { AnyAtom } from "./atom.ts";
import type { Identity } from "./identifier.ts";

export type Molecule = {
  identity: Identity;
  atoms: AnyAtom[];
  version: string;
  // deno-lint-ignore no-explicit-any
  serialize(): Record<string, any>;
  use(...names: string[]): AnyAtom[];
  wasModified(): boolean;
  mutate(mutator: (ctx: Molecule) => Promise<void>): Promise<void>;
};

export const molecule = (
  identity: Identity,
  atoms: AnyAtom[],
  version: string = "",
) => {
  return {
    identity: identity,
    version: version,
    atoms: atoms,
    serialize() {
      return atoms.reduce((res, atom) => {
        res[atom.name] = atom.value;
        return res;
      }, {} as Record<string, unknown>);
    },
    use(...names: string[]) {
      const items: AnyAtom[] = [];

      names.forEach((name) => {
        const atom = atoms.find((atom) => atom.name === name);
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
