import { AssertionError, type CoreError } from "./errors.ts";
import { decodeTime, monotonicUlid, baseUlid, sprintf } from "./deps.ts";

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

export const createLog = (...msg: string[]) => {
  return sprintf("[%s]: %s", new Date().toISOString(), msg.join(" "));
};

export const measure = () => {
  const now = performance.now();
  return () => {
    return performance.now() - now;
  };
};

export type Ulid = string;
export const ulid = {
  new() {
    return monotonicUlid();
  },
  getTime(ulid: string): number {
    return decodeTime(ulid);
  },
  fromTime(date: number): string {
    return baseUlid(date);
  },
  fromDate(date: Date): string {
    return baseUlid(date.getTime());
  },
  unixEpochStart() {
    const START_OF_EPOCH = new Date(1);
    const UNIX_EPOCH_START_DATE = ulid.fromDate(START_OF_EPOCH);
    return UNIX_EPOCH_START_DATE;
  }
};
