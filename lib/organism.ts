// this should be runtime

import { IdentityInstance } from "./identity.ts";
import { PrimitiveKind } from "./primitive.ts";

// export type NaturalRepo = {
//   // always persist in transaction mode
//   persist: (...items: Array<AnyAtom | Molecule>) => Promise<void>;
//   restore: <T = unknown>(
//     identifier: Identity,
//     partialAtoms?: IdentityItem[],
//   ) => Promise<T | null>;
// };

// export type ActivityRepo = {
//   // append only storage
//   add: (...items: Array<AnyActivity>) => Promise<void>;
//   scan: (lastUlid: Ulid | Identity) => Promise<AnyActivityData[]>;
// };

// export interface Runtime<S> {
//   secret: string;
//   repository: NaturalRepo;
//   activity: ActivityRepo;
//   services: S;
// }

type IdentifiableAndValuedOfAndKindPrimitive = {
  kind: PrimitiveKind, 
  identity: IdentityInstance, 
  serialize: () => unknown
}

// for testing purposes
export function memory(identity: IdentityInstance) {
  
  const memoryRepository = new Map();

  return {
    identity: identity,
    repository: {
      async persist(...items: IdentifiableAndValuedOfAndKindPrimitive[]): Promise<void> {
        for (const item of items) {
          memoryRepository.set(item.identity.serialize(), item.serialize());
        }
      }
    }
  }
}

// for production purposes based on deno kv
// export function durable() {

// }