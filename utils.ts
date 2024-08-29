import { sprintf } from "@std/fmt/printf";
import { monotonicUlid } from "@std/ulid";
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

export const createLog: (...msg: string[]) => string = (...msg: string[]) => {
  return msg.join(" ");
};

export const measure: () => () => number = () => {
  const now = performance.now();
  return () => {
    return performance.now() - now;
  };
};

export { sprintf };

export const ulid = monotonicUlid;
