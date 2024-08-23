import {
  deserialize,
  identity,
  type IdentityInstance,
  serialize,
} from "./identity.ts";
import type { CommitResultMessage } from "./repository.ts";
import { ulid } from "./ulid.ts";

export type PersistReadyItem<T = unknown> = {
  key: string;
  val: T;
  ver: string;
};
export type Runtime = {
  set(...items: Array<PersistReadyItem>): Promise<CommitResultMessage[]>;
  get<T = unknown>(key: IdentityInstance): Promise<PersistReadyItem<T>>;
  scan<T = unknown>(
    prefix: IdentityInstance,
    start: IdentityInstance,
    limit: number,
  ): Promise<T[]>;
};

const store = new Map();

// TODO: create deno kv runtime with transactions!

export const memoryRuntime: Runtime = {
  get: async (key: IdentityInstance) => {
    const item = await store.get(key.serialize());
    return item;
  },
  set: async (...items: PersistReadyItem[]) => {
    const commitMsgs: CommitResultMessage[] = [];
    for (const item of items) {
      item.ver = ulid.new();
      await store.set(item.key, item);
      commitMsgs.push({
        status: true,
        versionstamp: item.ver,
      });
    }
    return commitMsgs;
  },
  scan: async (
    prefix: IdentityInstance,
    start: IdentityInstance,
    limit: number,
  ) => {
    const items = [];
    for (const [_, { key, val }] of store) {
      if (
        key.startsWith(prefix.serialize())
      ) {
        if (start && start.key.length) {
          if (
            key.localeCompare(
              start.serialize(),
            ) > 0
          ) {
            items.push(val);
          } else {
            continue;
          }
        } else {
          items.push(val);
        }
      }

      if (items.length >= limit) {
        break;
      }
    }

    return items;
  },
};
