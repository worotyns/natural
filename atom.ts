import type { Identity, IdentityItem } from "./identifier.ts";

export type Atom<T = unknown> = {
  name: IdentityItem;
  value: T;
  version: string;
  identity: Identity;
  wasModified(): boolean;
  mutate(newValue: T): void;
};

// deno-lint-ignore no-explicit-any
export type AnyAtom = Atom<any>;

// basic primitive
export const atom = <T = unknown>(
  name: IdentityItem,
  value: T,
  version = "",
): AnyAtom => {
  const prevValues: T[] = [];
  return {
    name,
    value,
    version,
    identity: [name],
    wasModified() {
      return prevValues.length > 0 && !prevValues.includes(value);
    },
    mutate(newVal: T): void {
      prevValues.push(newVal);
      this.value = newVal;
    },
  };
};
export const isAtom = (item: unknown): item is AnyAtom => {
  return typeof item === "object" && item !== null && "name" in item &&
    "value" in item;
};
