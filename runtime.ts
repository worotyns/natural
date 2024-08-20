import type { AnyAtom } from "./atom.ts";
import type { Identity } from "./identifier.ts";
import type { Molecule } from "./molecule.ts";

export type NaturalRepo = {
  persist: (...items: Array<AnyAtom | Molecule>) => Promise<void>;
  restore: <T = unknown>(identifier: Identity) => Promise<T | null>;
};

export interface Runtime<S> {
  secret: string;
  repository: NaturalRepo;
  services: S;
}
