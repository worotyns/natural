import { identity } from "./identity.ts";
import type { CommitResultMessage } from "./repository.ts";
import { ulid } from "./ulid.ts";

export type PersistReadyItem<T = unknown> = {
  key: string[];
  val: T;
  ver: string;
};
export type Runtime = {
  set(...items: Array<PersistReadyItem>): Promise<CommitResultMessage[]>;
  get<T = unknown>(key: string[]): Promise<PersistReadyItem<T>>;
  scan<T = unknown>(
    prefix: string[],
    start: string[],
    limit: number,
  ): Promise<T[]>;
};

const store = new Map();

export const memoryRuntime: Runtime = {
  get: async (key: string[]) => {
    const item = await store.get(identity(...key).serialize());
    return item;
  },
  set: async (...items: PersistReadyItem[]) => {
    const commitMsgs: CommitResultMessage[] = [];
    for (const item of items) {
      item.ver = ulid.new();
      await store.set(identity(...item.key).serialize(), item);
      commitMsgs.push({
        status: true,
        versionstamp: item.ver,
      });
    }
    return commitMsgs;
  },
  scan: async (prefix: string[], start: string[], limit: number) => {
    const items = [];
    for (const [_, {key, val}] of store) {
      if (
        identity(...key).serialize().startsWith(identity(...prefix).serialize())
      ) {
        if (start && start.length) {
          if (
            identity(...key).serialize().localeCompare(
              identity(...start).serialize(),
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
