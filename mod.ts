import {
  type Atom,
  atomFactory,
  type BaseSchema,
  type NamespacedIdentity,
} from "./atom.ts";
import { identity } from "./identity.ts";
import { denoRuntime, memoryRuntime } from "./repository.ts";
export type { Atom, AtomContext, NamespacedIdentity } from "./atom.ts";
export { identity } from "./identity.ts";

const repository = (Deno.env.get("DENO_ENV")?.startsWith("prod"))
  ? await denoRuntime()
  : await memoryRuntime();

export function atom<Schema extends BaseSchema>(
  nsid: NamespacedIdentity,
  defaults: Schema,
): Atom<Schema> {
  return atomFactory<Schema>(identity(nsid), defaults, repository, {isInTransactionScope: false});
}

export function scan(prefix: NamespacedIdentity, start: NamespacedIdentity) {
  return repository.scan(prefix, start);
}
