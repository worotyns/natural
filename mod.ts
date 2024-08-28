import {
  type Atom,
  atomFactory,
  type BaseSchema,
  type NamespacedIdentity,
} from "./atom.ts";
import { denoRuntime, memoryRuntime } from "./repository.ts";

const repository = (Deno.env.get("DENO_ENV")?.startsWith("prod"))
  ? await denoRuntime()
  : await memoryRuntime();

export function atom<Schema extends BaseSchema>(
  nsid: NamespacedIdentity,
  defaults: Schema,
): Atom<Schema> {
  return atomFactory<Schema>(nsid, defaults, repository);
}

export function scan(prefix: NamespacedIdentity, start: NamespacedIdentity) {
  return repository.scan(prefix, start);
}
