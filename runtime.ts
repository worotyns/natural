import { VersionError } from "./errors.ts";
import { deserialize, identity, type IdentityInstance } from "./identity.ts";
import type { CommitResultMessage } from "./repository.ts";
import { ulid } from "./ulid.ts";
import { sprintf } from "./utils.ts";

export type PersistReadyItem<T = unknown> = {
  key: string;
  val: T;
  ver: string;
};
export type Runtime = {
  set(...items: Array<PersistReadyItem>): Promise<CommitResultMessage[]>;
  get<T = unknown>(key: IdentityInstance): Promise<PersistReadyItem<T> | null>;
  scan<T = unknown>(
    prefix: IdentityInstance,
    start: IdentityInstance,
    limit: number,
  ): Promise<T[]>;
};

const store = new Map();

export const memoryRuntime: Runtime = {
  get: async (key: IdentityInstance) => {
    const item = await store.get(key.serialize());
    return item;
  },
  set: async (...items: PersistReadyItem[]) => {
    const commitMsgs: CommitResultMessage[] = [];
    for (const item of items) {
      const currentItem = await store.get(item.key);
      const isVersionError = item.ver && currentItem &&
        currentItem.ver !== item.ver;
      if (isVersionError) {
        console.warn(
          sprintf(
            'problem with update key "%s", previous version "%s", new version "%s"',
            item.key,
            currentItem.ver,
            item.ver,
          ),
        );
        throw new VersionError(
          "Cannot commit transaction due to version errors",
        );
      }
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

const db = await Deno.openKv();

const toAtomicCheck = (item: PersistReadyItem): Deno.AtomicCheck => {
  return {
    key: deserialize(item.key).key,
    versionstamp: item.ver,
  };
};

export const denoRuntime: Runtime = {
  get: async <T = unknown>(key: IdentityInstance) => {
    const item = await db.get(key.key);

    if (!item) {
      return null;
    }

    return {
      key: identity(...item.key.map((i) => i.toString())).serialize(),
      val: item.value as T,
      ver: item.versionstamp,
    } as PersistReadyItem<T>;
  },
  set: async (...items: PersistReadyItem[]) => {
    const transaction = db.atomic();
    for (const item of items) {
      if (item.ver) {
        const check = toAtomicCheck(item);
        transaction.check(check);
      }
      transaction.set(deserialize(item.key).key, item.val);
    }

    const result = await transaction.commit();

    if (!result.ok) {
      console.warn(items);
      throw new VersionError("Cannot commit transaction due to version errors");
    }

    return items.map(() => ({
      status: result.ok,
      versionstamp: "versionstamp" in result ? result.versionstamp : null,
    })) as CommitResultMessage[];
  },
  scan: async <T = unknown>(
    prefix: IdentityInstance,
    start: IdentityInstance,
    limit: number,
  ) => {
    const activity: T[] = [];

    for await (
      const item of db.list<T>({
        prefix: prefix.key,
        start: start.key,
      }, {
        limit: limit,
      })
    ) {
      activity.push(item.value);
    }

    return activity;
  },
};
