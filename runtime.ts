import type { Versionstamp } from "./atom.ts";
import { VersionError } from "./errors.ts";
import { identity } from "./identity.ts";
import type { NamespacedIdentity } from "./mod.ts";
import type { CommitResultMessage } from "./repository.ts";
import { ulid } from "./ulid.ts";
import { sprintf } from "./utils.ts";

export type PersistReadyItem<T = unknown> = {
  key: NamespacedIdentity;
  val: T;
  ver: Versionstamp;
};
export type Runtime = {
  set(...items: Array<PersistReadyItem>): Promise<CommitResultMessage[]>;
  get<T = unknown>(
    key: NamespacedIdentity,
  ): Promise<PersistReadyItem<T> | null>;
  scan<T = unknown>(
    prefix: NamespacedIdentity,
    start: NamespacedIdentity,
    limit: number,
  ): Promise<T[]>;
};

const store = new Map();

export const memoryRuntime: Runtime = {
  get: async (key: NamespacedIdentity) => {
    const item = await store.get(key);
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
    prefixNs: NamespacedIdentity,
    startNs: NamespacedIdentity,
    limit: number,
  ) => {
    const start = deserialize(startNs);

    const items = [];
    for (const [_, { key, val }] of store) {
      if (
        key.startsWith(prefixNs)
      ) {
        if (start && start.key.length) {
          if (
            key.localeCompare(
              start,
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
  get: async <T = unknown>(key: NamespacedIdentity) => {
    const denoKey = deserialize(key);
    const item = await db.get(denoKey.key);

    if (!item) {
      return null;
    }

    return {
      key: identity(...item.key.map((i) => i.toString())),
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
    prefixNs: NamespacedIdentity,
    startNs: NamespacedIdentity,
    limit: number,
  ) => {
    const prefix = deserialize(prefixNs);
    const start = deserialize(startNs);

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

function deserialize(key: NamespacedIdentity) {
  const [ns, path] = key.split("://");
  return {
    namespace: ns,
    path,
    key: path.split("/"),
  };
}
