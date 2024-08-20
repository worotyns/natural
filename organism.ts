import { type AnyAtom, atom } from "./atom.ts";
import { type Cell, cell, type CellCtx } from "./cell.ts";
import { combine, type Identity, type IdentityItem } from "./identifier.ts";
import { type Molecule, molecule } from "./molecule.ts";
import type { Runtime } from "./runtime.ts";

interface Organism<S> {
  runtime: Runtime<S>;
  identity: (identity: Identity) => Identity;
  atom: (atomIdentity: IdentityItem, value: unknown) => AnyAtom;
  molecule: (moleculeIdentity: Identity, atoms: AnyAtom[]) => Molecule;
  cell: (
    cellIdentity: Identity,
    runner: (ctx: CellCtx<S>) => Promise<void>,
  ) => Cell;
}

// deno-lint-ignore ban-types
export const organism = <S = Record<string, Function>>(
  organismIdentity: Identity,
  runtime: Runtime<S>,
): Organism<S> => {
  return {
    // maybe override persist and restore with organism identity?
    runtime: runtime,
    identity: (identity: Identity) => {
      return combine(organismIdentity, identity);
    },
    atom: (atomIdentity: IdentityItem, value: unknown) => {
      return atom(atomIdentity, value);
    },
    molecule: (moleculeIdentity: Identity, atoms: AnyAtom[]) => {
      return molecule(combine(organismIdentity, moleculeIdentity), atoms);
    },
    cell: (
      cellIdentity: Identity,
      runner: (ctx: CellCtx<typeof runtime["services"]>) => Promise<void>,
    ) => {
      return cell(combine(organismIdentity, cellIdentity), runner, runtime);
    },
  };
};
