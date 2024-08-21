import type { AnyActivity, AnyActivityData } from "./activity.ts";
import type { AnyAtom } from "./atom.ts";
import type { Identity } from "./identifier.ts";
import type { Molecule } from "./molecule.ts";
import type { Ulid } from "./utils.ts";

export type NaturalRepo = {
  persist: (...items: Array<AnyAtom | Molecule>) => Promise<void>;
  restore: <T = unknown>(identifier: Identity) => Promise<T | null>;
};

export type ActivityRepo = {
  add: (...items: Array<AnyActivity>) => Promise<void>;
  scan: (lastUlid: Ulid | Identity) => Promise<AnyActivityData[]>;
};

export interface Runtime<S> {
  secret: string;
  repository: NaturalRepo;
  activity: ActivityRepo;
  services: S;
}
