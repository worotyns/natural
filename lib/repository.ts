import type { IdentityInstance, IdentityItem } from "./identity.ts";
import type { PrimitiveKind } from "./primitive.ts";
import type { AnyAtom, SerializedAtom } from "./atom.ts";
import type { AnyActivity, AnyActivityData } from "./activity.ts";
import type { Ulid } from "./ulid.ts";
import type { Molecule } from "./molecule.ts";

export type IdentifiableAndValuedOfAndKindPrimitive = {
  kind: PrimitiveKind;
  identity: IdentityInstance;
  serialize: () => SerializedAtom;
};

export type NaturalRepo = {
  persist: (...items: Array<AnyAtom | Molecule>) => Promise<CommitResultMessage[]>;
  restore: <T = unknown>(
    identifier: IdentityInstance,
    partialAtoms?: IdentityItem[],
  ) => Promise<T | null>;
};

export type ActivityRepo = {
  add: (...items: Array<AnyActivity>) => Promise<void>;
  scan: (lastUlid: Ulid | IdentityInstance) => Promise<AnyActivityData[]>;
};

export type Runtime = {
  repository: NaturalRepo;
  activity: ActivityRepo;
}

export type CommitResultMessage = { status: boolean; versionstamp: string };
