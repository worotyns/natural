import { decodeTime, monotonicUlid, ulid as baseUlid } from "@std/ulid";

export interface UlidNamespace {
  "new"(): string;
  getTime(ulid: string): number;
  fromTime(date: number): string;
  fromDate(date: Date): string;
  unixEpochStart(): string;
}

export type Ulid = string;
export const ulid: UlidNamespace = {
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
  },
};
