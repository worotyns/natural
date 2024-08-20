import { type AnyAtom, atom } from "./atom.ts";
import { cell, type CellCtx } from "./cell.ts";
import { combine, type Identity, type IdentityItem } from "./identifier.ts";
import { molecule } from "./molecule.ts";
import type { Runtime } from "./runtime.ts";

// deno-lint-ignore ban-types
export const organism = <S = Record<string, Function>>(
  organismIdentity: Identity,
  runtime: Runtime<S>,
) => {
  return {
    // moze persist i restore nadpisac z organism identity?
    // a moze po prostu create identity dla takich caseow albo electron() xD jako wolny elektron
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
    }
  };
};
