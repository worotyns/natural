import {
  type ActivityReference,
  type Atom,
  atomFactory,
  type BaseSchema,
  type NamespacedIdentity,
} from "./atom.ts";
import { identity } from "./identity.ts";
import { denoRuntime, memoryRuntime } from "./repository.ts";
import { isProd, type Ulid } from "./utils.ts";
export type { Atom, AtomContext, NamespacedIdentity } from "./atom.ts";
export { identity } from "./identity.ts";

const repository = isProd() ? await denoRuntime() : await memoryRuntime();

export function atom<Schema extends BaseSchema>(
  nsid: NamespacedIdentity,
  defaults: Schema,
): Atom<Schema> {
  return atomFactory<Schema>(identity(nsid), defaults, repository, {
    isInTransactionScope: false,
    references: new Set(),
  });
}

export function activities(start: Ulid) {
  return repository.scan<ActivityReference>(
    `ns://activities/`,
    `ns://activities/${start}`,
  );
}

export function scan(prefix: NamespacedIdentity, start: NamespacedIdentity) {
  return repository.scan(prefix, start);
}
