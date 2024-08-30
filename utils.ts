import { sprintf } from "@std/fmt/printf";
import { decodeTime, monotonicUlid, ulid as createUlid } from "@std/ulid";
import { AssertionError, type CoreError } from "./errors.ts";

export function slug(value: string): string {
  return value.trim().replace(/[^a-z0-9]+/gi, "-").toLowerCase();
}

export function assert(
  expr: unknown,
  coreErrorOrMsg: string | CoreError,
): asserts expr {
  if (!expr) {
    if (typeof coreErrorOrMsg === "string") {
      throw new AssertionError(coreErrorOrMsg);
    }

    throw coreErrorOrMsg;
  }
}

export const measure: () => () => number = () => {
  const now = performance.now();
  return () => {
    return performance.now() - now;
  };
};

export const ulid = monotonicUlid;
export const unixEpochStart = createUlid(Date.UTC(1970, 0, 1, 0, 0, 0, 1));
export { decodeTime, sprintf };

export function isProd() {
  return Deno.env.get("DENO_ENV")?.startsWith("prod") ?? false;
}
