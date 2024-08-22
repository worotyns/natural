import type { AnyActivity, AnyActivityData } from "./activity.ts";
import { assert } from "./assert.ts";
import type { IdentityInstance } from "./identity.ts";
import type { Runtime } from "./repository.ts";
import type { Ulid } from "./ulid.ts";

export function createMemory(): Runtime {
  const activityStore: Set<AnyActivity> = new Set<AnyActivity>();

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

  const store = new Map();

  return {
    repository: {
      persist: async () => {
        return [];
      },
      restore: async () => {
        return null;
      },
    },
    activity: {
      add,
      scan,
    },
  };
}
