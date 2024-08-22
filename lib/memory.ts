import { assert } from "./assert.ts";
import { PrimitiveKind, PrimitiveValue } from "./primitive.ts";
import { type Ulid, ulid } from "./ulid.ts";
import type { AnyActivity, AnyActivityData } from "./activity.ts";
import type { AnyAtom } from "./atom.ts";
import type { IdentityInstance } from "./identity.ts";
import type { Molecule } from "./molecule.ts";
import type { CommitResultMessage, Runtime } from "./repository.ts";

const store = new Map();
const activityStore: Set<AnyActivity> = new Set<AnyActivity>();

export function createMemory(): Runtime {

  const add = async (...items: Array<AnyActivity>) => {
    for (const item of items) {
      await activityStore.add(item);
    }
  };

  // deno-lint-ignore require-await
  const scan = async (rawUlid: Ulid | IdentityInstance) => {
    const activity: AnyActivityData[] = [];
    const startFrom = Array.isArray(rawUlid) ? rawUlid.at(1)! : rawUlid;
    assert(startFrom, "startFrom is not defined");

    for (const item of activityStore) {
      if (item.identity.key.at(1)!.localeCompare(startFrom) >= 0) {
        activity.push({
          k: item.value.k,
          t: item.value.t,
          v: item.value.v,
        });
      }
    }

    return activity;
  };

  return {
    repository: {
      persist: async (...items: Array<AnyAtom | Molecule>) => {
        const commitMsgs: CommitResultMessage[] = [];

        for (const item of items) {
          switch(item.kind) {
            case PrimitiveKind.Molecule:
              item.version = ulid.new();

              for (const [key, value] of Object.entries(item.serialize())) {
                store.set(key, value);
              };

              break;
            case PrimitiveKind.Atom:
              commitMsgs.push({
                status: true,
                versionstamp: ulid.new()
              });

              for (const [key, value] of Object.entries(item.serialize())) {
                store.set(key, value);
              };

              break;
          }
        };

        console.log(store);

        return commitMsgs;
      },
      restore: async (identity: IdentityInstance) => {
        const item = store.get(identity.serialize());

        switch(item.k) {
          case PrimitiveValue.Boolean:
          case PrimitiveValue.Number:
          case PrimitiveValue.String:
          case PrimitiveValue.List:
            
          case PrimitiveValue.Date:
          case PrimitiveValue.Object:
          case PrimitiveValue.Map:
          case PrimitiveValue.Collection:
            console.log(item.k);
            break;
          default:
            throw new Error('Wtf');
        }

        // for (const [serializedIdentity, value] of Object.entries(item as any)) {
        //   console.log(serializedIdentity, value);
        // }

        console.log(item);
        return null;
      },
    },
    activity: {
      add,
      scan,
    },
  };
}
