import type {
  Atom,
  BaseSchema,
  NamespacedIdentity,
  Optional,
  Repository,
  StoredItem,
  Versionstamp,
} from "./atom.ts";
import { VersionError } from "./errors.ts";
import { decodeTime, isProd, sprintf, ulid } from "./utils.ts";

function deserialize(key: NamespacedIdentity) {
  const [ns, path] = key.split("://");
  return {
    namespace: ns,
    path,
    key: path.split("/"),
  };
}

export const store = new Map();

// deno-lint-ignore require-await
export const memoryRuntime = async (): Promise<Repository> => {
  return {
    restore: async (key: NamespacedIdentity) => {
      const item = await store.get(key);
      return item;
    },
    persist: async (...items: Atom<BaseSchema>[]): Promise<Versionstamp> => {
      const lastVer: Versionstamp = ulid();

      for (const item of items) {
        const currentItem = await store.get(item.nsid);
        const isVersionError = item.version && currentItem &&
          currentItem.ver !== item.version;
        if (isVersionError) {
          console.warn(
            sprintf(
              'problem with update key "%s", previous version "%s", new version "%s"',
              item.nsid,
              currentItem.ver,
              item.version,
            ),
          );
          throw new VersionError(
            "Cannot commit transaction due to version errors",
          );
        }

        item.version = lastVer;
        await store.set(item.nsid, {
          key: item.nsid,
          val: item.value,
          ver: lastVer,
        });
      }

      return lastVer;
    },
    // deno-lint-ignore require-await
    scan: async (
      prefixNs: NamespacedIdentity,
      startNs: NamespacedIdentity,
    ) => {
      const items = [];
      for (const [_, { key, val }] of store) {
        if (
          key.startsWith(prefixNs)
        ) {
          if (startNs) {
            if (
              key.localeCompare(
                startNs,
              ) > 0
            ) {
              items.push({ ...val, key: key, ts: extractDate(key) });
            } else {
              continue;
            }
          }
        }

        if (items.length >= 100) {
          break;
        }
      }

      return items;
    },
  };
};

function isUlid(value: string) {
  return value.length === 26 && /^[A-Z0-9]+$/.test(value);
}

function extractDateFromParts(parts: string[]): number {
  for (const part of parts) {
    if (isUlid(part)) {
      return decodeTime(part);
    }
  }

  return 0;
}

function extractDate(key: NamespacedIdentity) {
  const [_ns, path] = key.split("://");
  const parts = path.split("/");
  return extractDateFromParts(parts);
}

export const denoRuntime = async (): Promise<Repository> => {
  const db = await Deno.openKv();

  const toAtomicCheck = (item: Atom<BaseSchema>): Deno.AtomicCheck => {
    return {
      key: deserialize(item.nsid).key,
      versionstamp: item.version,
    };
  };

  return {
    restore: async <Schema extends BaseSchema>(
      key: NamespacedIdentity,
    ): Promise<Optional<StoredItem<Schema>>> => {
      const denoKey = deserialize(key);
      const item = await db.get(denoKey.key);

      if (!item || (!item.versionstamp && !item.value)) {
        return null;
      }

      return {
        key: key,
        val: item.value as Schema,
        ver: item.versionstamp || "",
      };
    },
    persist: async (...items: Atom<BaseSchema>[]): Promise<Versionstamp> => {
      const transaction = db.atomic();

      for (const item of items) {
        if (item.version) {
          const check = toAtomicCheck(item);
          transaction.check(check);
        }
        transaction.set(deserialize(item.nsid).key, item.value);
      }

      const result = await transaction.commit();

      if (!result.ok) {
        console.warn(items);
        throw new VersionError(
          "Cannot commit transaction due to version errors",
        );
      }

      return result.versionstamp;
    },
    scan: async <T = unknown>(
      prefixNs: NamespacedIdentity,
      startNs: NamespacedIdentity,
    ) => {
      const prefix = deserialize(prefixNs);
      const start = deserialize(startNs);

      const activity: T[] = [];

      for await (
        const item of db.list<T>({
          prefix: prefix.key,
          start: start.key,
        }, {
          limit: 100,
        })
      ) {
        activity.push({
          ...item.value,
          key: item.key,
          ts: extractDateFromParts(item.key as string[]),
        });
      }

      return activity;
    },
  };
};

export async function clearStorage() {
  if (!isProd()) {
    store.clear();
  }

  const db = await Deno.openKv();

  for await (const item of db.list({ prefix: [] })) {
    await db.delete(item.key);
  }

  await db.close();
}

export async function dumpStorage() {
  if (!isProd()) {
    return console.log(Deno.inspect(store, {colors: true, depth: Infinity}));
  }

  const db = await Deno.openKv();

  for await (const item of db.list({ prefix: [] })) {
    console.log(item.key);
  }

  await db.close();
}