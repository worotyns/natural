import { RuntimeError } from "./errors.ts";
import type { IdentityInstance, IdentitySerialized } from "./identity.ts";
import type { Molecule } from "./molecule.ts";
import { PrimitiveKind, PrimitiveValue } from "./primitive.ts";

// sortable and equalable string
export type Versionstamp = string;

// special atom collection type
export type AtomCollection = (AnyAtom & BaseAtomHelpers<unknown>)[];
// special atom record type
export type AtomMap = {
  [key: string]: AnyAtom & BaseAtomHelpers<unknown>;
};

// primitive types
export type PrimitiveObject = {
  [key: string]: Primitive | PrimitiveList;
};
export type PrimitiveList = Primitive[];
export type Primitive =
  | string
  | boolean
  | number
  | Date
  | PrimitiveObject
  | PrimitiveList;

// atom must have identity
// atom must have value
// atom must have a version stamp
export type Atom<
  ValueType,
  ValueTypeKind extends PrimitiveValue = PrimitiveValue,
> = {
  kind: PrimitiveKind.Atom;
  identity: IdentityInstance;
  value: ValueType;
  valueKind: ValueTypeKind;
  version: Versionstamp;
};

// deno-lint-ignore no-explicit-any
export type AnyAtom = Atom<any> & BaseAtomHelpers<any> & BaseOrganismHelpers;

export type SerializedAtomWithReferences = {
  [i: IdentitySerialized]: SerializedAtom;
};

export type SerializedAtom = {
  value: {
    i: IdentitySerialized;
    k: PrimitiveKind;
    v: Primitive;
    t: PrimitiveValue;
  };
  version: Versionstamp;
};

// base atom interface that allows mutation and persistence
type BaseAtomHelpers<V> = {
  toJSON(): object;
  // drop references by structured clone
  valueOf(): V;
  // ready to store in database
  serialize(
    references?: SerializedAtomWithReferences,
  ): SerializedAtomWithReferences;
  // basic primitive for updates
  mutate(value: V): void;
  setVersion: (version: string) => void;
};

// base logic for persistence and archiving
type BaseOrganismHelpers = {
  // should be used only when persisting single instance of atom
  // in case of a molecule, should be used persist on molecule due to different transaction level
  persist(): Promise<void>;
  // archive(): Promise<void>;
};

// raw atom implementation
export function atom<V, K extends PrimitiveValue, H extends BaseAtomHelpers<V>>(
  value: V,
  valueKind: K,
  identity: IdentityInstance,
  version: Versionstamp,
  helpers: H,
  molecule?: Molecule,
): Atom<V, K> & H & BaseOrganismHelpers {
  return {
    ...helpers,
    identity,
    kind: PrimitiveKind.Atom,
    valueKind: valueKind,
    value: value,
    version: version,
    async persist() {
      if (!molecule) {
        throw new RuntimeError(
          "Cannot persist without an molecule, create atom from molecule first. Then you will able to use .persist() on atom.",
        );
      }
      const [response] = await molecule.runtime.atoms.persist(this);
      this.version = response.versionstamp;
    },
  };
}

// string atom helpers
interface StringAtomHelpers extends BaseAtomHelpers<string> {}

// interface of string atom with all helpers
export type StringAtom =
  & Atom<string, PrimitiveValue.String>
  & StringAtomHelpers
  & BaseOrganismHelpers;

// string atom with validation, guards and other helpers
export function string(
  value: string,
  identity: IdentityInstance,
  molecule?: Molecule,
): StringAtom {
  return atom<string, PrimitiveValue.String, StringAtomHelpers>(
    value,
    PrimitiveValue.String,
    identity,
    "",
    {
      setVersion(this: StringAtom, version: string) {
        this.version = version;
      },
      mutate(this: StringAtom, newValue: string) {
        this.value = newValue;
      },
      toJSON(this: StringAtom) {
        return {
          [this.identity.serialize()]: this.valueOf(),
        };
      },
      serialize(this: StringAtom) {
        return {
          [this.identity.serialize()]: {
            version: this.version,
            value: {
              i: this.identity.serialize(),
              t: this.valueKind,
              v: this.valueOf(),
              k: this.kind,
            },
          },
        };
      },
      valueOf(this: StringAtom) {
        return this.value.valueOf();
      },
    },
    molecule,
  );
}

// number atom helpers
export type NumberAtom =
  & Atom<number, PrimitiveValue.Number>
  & NumberAtomHelpers
  & BaseAtomHelpers<number>
  & BaseOrganismHelpers;

// interface of number atom with all helpers
interface NumberAtomHelpers extends BaseAtomHelpers<number> {}

// number atom with validation, guards and other helpers
export function number(
  value: number,
  identity: IdentityInstance,
  molecule?: Molecule,
): NumberAtom {
  return atom<number, PrimitiveValue.Number, NumberAtomHelpers>(
    value,
    PrimitiveValue.Number,
    identity,
    "",
    {
      setVersion(this: NumberAtom, version: string) {
        this.version = version;
      },
      mutate(this: NumberAtom, newValue: number) {
        this.value = newValue;
      },
      toJSON(this: NumberAtom) {
        return {
          [this.identity.serialize()]: this.valueOf(),
        };
      },
      serialize(this: NumberAtom) {
        return {
          [this.identity.serialize()]: {
            version: this.version,
            value: {
              i: this.identity.serialize(),
              t: this.valueKind,
              v: this.valueOf(),
              k: this.kind,
            },
          },
        };
      },
      valueOf(this: NumberAtom) {
        return this.value.valueOf();
      },
    },
    molecule,
  );
}

// boolean atom helpers
export type BooleanAtom =
  & Atom<boolean, PrimitiveValue.Boolean>
  & BooleanAtomHelpers
  & BaseAtomHelpers<boolean>
  & BaseOrganismHelpers;

// interface of boolean atom with all helpers
interface BooleanAtomHelpers extends BaseAtomHelpers<boolean> {
  toggle(): void;
  positive(): void;
  negative(): void;
}

// boolean atom with validation, guards and other helpers
export function boolean(
  value: boolean,
  identity: IdentityInstance,
  molecule?: Molecule,
): BooleanAtom {
  return atom<boolean, PrimitiveValue.Boolean, BooleanAtomHelpers>(
    value,
    PrimitiveValue.Boolean,
    identity,
    "",
    {
      setVersion(this: BooleanAtom, version: string) {
        this.version = version;
      },
      mutate(this: BooleanAtom, newValue: boolean) {
        this.value = newValue;
      },
      toJSON(this: BooleanAtom) {
        return {
          [this.identity.serialize()]: this.valueOf(),
        };
      },
      serialize(this: BooleanAtom) {
        return {
          [this.identity.serialize()]: {
            version: this.version,
            value: {
              i: this.identity.serialize(),
              t: this.valueKind,
              v: this.valueOf(),
              k: this.kind,
            },
          },
        };
      },
      valueOf(this: BooleanAtom) {
        return this.value.valueOf();
      },
      toggle(this: BooleanAtom) {
        this.value = !this.value;
      },
      positive(this: BooleanAtom) {
        this.value = true;
      },
      negative(this: BooleanAtom) {
        this.value = false;
      },
    },
    molecule,
  );
}

// date atom helpers
interface DateAtomHelpers extends BaseAtomHelpers<Date> {}

// interface of date atom with all helpers
export type DateAtom = Atom<Date, PrimitiveValue.Date> & DateAtomHelpers;

// date atom with validation, guards and other helpers
export function date(
  value: Date,
  identity: IdentityInstance,
  molecule?: Molecule,
): DateAtom {
  return atom<Date, PrimitiveValue.Date, DateAtomHelpers>(
    value,
    PrimitiveValue.Date,
    identity,
    "",
    {
      setVersion(this: DateAtom, version: string) {
        this.version = version;
      },
      mutate(this: DateAtom, newValue: Date) {
        this.value = newValue;
      },
      toJSON(this: DateAtom) {
        return {
          [this.identity.serialize()]: this.valueOf(),
        };
      },
      serialize(this: DateAtom) {
        return {
          [this.identity.serialize()]: {
            version: this.version,
            value: {
              i: this.identity.serialize(),
              t: this.valueKind,
              v: this.valueOf().toISOString(),
              k: this.kind,
            },
          },
        };
      },
      valueOf(this: DateAtom) {
        return new Date(this.value.getTime());
      },
    },
    molecule,
  );
}

// object atom helpers
interface ObjectAtomHelpers extends BaseAtomHelpers<PrimitiveObject> {}

// interface of object atom with all helpers
export type ObjectAtom =
  & Atom<PrimitiveObject, PrimitiveValue.Object>
  & ObjectAtomHelpers;

// object atom with validation, guards and other helpers
export function object(
  value: PrimitiveObject,
  identity: IdentityInstance,
  molecule?: Molecule,
): ObjectAtom {
  return atom<PrimitiveObject, PrimitiveValue.Object, ObjectAtomHelpers>(
    value,
    PrimitiveValue.Object,
    identity,
    "",
    {
      setVersion(this: ObjectAtom, version: string) {
        this.version = version;
      },
      mutate(this: ObjectAtom, newValue: PrimitiveObject) {
        this.value = newValue;
      },
      toJSON(this: ObjectAtom) {
        return {
          [this.identity.serialize()]: this.valueOf(),
        };
      },
      serialize(this: ObjectAtom) {
        return {
          [this.identity.serialize()]: {
            version: this.version,
            value: {
              i: this.identity.serialize(),
              t: this.valueKind,
              v: this.valueOf(),
              k: this.kind,
            },
          },
        };
      },
      valueOf(this: ObjectAtom) {
        return structuredClone(this.value);
      },
    },
    molecule,
  );
}

// boolean atom helpers
export type ListAtom =
  & Atom<PrimitiveList, PrimitiveValue.List>
  & ListAtomHelpers
  & BaseAtomHelpers<PrimitiveList>
  & BaseOrganismHelpers;

// interface of boolean atom with all helpers
interface ListAtomHelpers extends BaseAtomHelpers<PrimitiveList> {
  add(value: Primitive): void;
}

// atom list, guards and other helpers
export function list(
  value: PrimitiveList,
  identity: IdentityInstance,
  molecule?: Molecule,
): ListAtom {
  return atom<PrimitiveList, PrimitiveValue.List, ListAtomHelpers>(
    value,
    PrimitiveValue.List,
    identity,
    "",
    {
      add(this: ListAtom, value: Primitive) {
        this.value.push(value);
      },
      setVersion(this: ListAtom, version: string) {
        this.version = version;
      },
      mutate(this: ListAtom, newValue: PrimitiveList) {
        this.value = newValue;
      },
      toJSON(this: ListAtom) {
        return {
          [this.identity.serialize()]: this.valueOf(),
        };
      },
      serialize(this: ListAtom) {
        return {
          [this.identity.serialize()]: {
            version: this.version,
            value: {
              i: this.identity.serialize(),
              t: this.valueKind,
              v: this.valueOf(),
              k: this.kind,
            },
          },
        };
      },
      valueOf(this: ListAtom) {
        return structuredClone(this.value.valueOf()) as PrimitiveList;
      },
    },
    molecule,
  );
}

// collection atom helpers
export type CollectionAtom =
  & Atom<AtomCollection, PrimitiveValue.Collection>
  & CollectionAtomHelpers
  & BaseAtomHelpers<AtomCollection>
  & BaseOrganismHelpers;

// interface of collection atom with all helpers
interface CollectionAtomHelpers extends BaseAtomHelpers<AtomCollection> {
  add(atom: AnyAtom): void;
}

// atom collection, guards and other helpers
export function collection(
  value: AtomCollection,
  identity: IdentityInstance,
  molecule?: Molecule,
): CollectionAtom {
  return atom<AtomCollection, PrimitiveValue.Collection, CollectionAtomHelpers>(
    value,
    PrimitiveValue.Collection,
    identity,
    "",
    {
      setVersion(this: CollectionAtom, version: string) {
        this.version = version;
      },
      mutate(this: CollectionAtom, newValue: AtomCollection) {
        this.value = newValue;
      },
      add(this: CollectionAtom, atom: AnyAtom) {
        this.value.push(atom);
      },
      toJSON(this: CollectionAtom) {
        return {
          [this.identity.serialize()]: this.valueOf(),
        };
      },
      serialize(
        this: CollectionAtom,
        references: SerializedAtomWithReferences = {},
      ) {
        for (const atom of this.value) {
          const reference = atom.identity.serialize();
          if (reference in references) {
            throw new RuntimeError(
              "Cannot serialize atoms, with same identity: " + reference,
            );
          }

          references[reference] = atom.serialize(references)[reference];
        }

        return {
          ...references,
          [this.identity.serialize()]: {
            version: this.version,
            value: {
              i: this.identity.serialize(),
              t: this.valueKind,
              v: Object.keys(references),
              k: this.kind,
            },
          },
        };
      },
      valueOf(this: CollectionAtom) {
        return this.value.valueOf() as AtomCollection;
      },
    },
    molecule,
  );
}

// map atom helpers
export type MapAtom =
  & Atom<AtomMap, PrimitiveValue.Map>
  & MapAtomHelpers
  & BaseAtomHelpers<AtomMap>
  & BaseOrganismHelpers;

// interface of map atom with all helpers
interface MapAtomHelpers extends BaseAtomHelpers<AtomMap> {
  has(key: string): boolean;
  set(key: string, val: AnyAtom): void;
  del(key: string): void;
  get(key: string): null | AnyAtom;
}

// atom collection, guards and other helpers
export function map(
  value: AtomMap,
  identity: IdentityInstance,
  molecule?: Molecule,
): MapAtom {
  return atom<AtomMap, PrimitiveValue.Map, MapAtomHelpers>(
    value,
    PrimitiveValue.Map,
    identity,
    "",
    {
      del(this: MapAtom, key: string) {
        delete this.value[key];
      },
      get(this: MapAtom, key: string) {
        return this.value[key] || null;
      },
      has(this: MapAtom, key: string) {
        return key in this.value;
      },
      set(this: MapAtom, key: string, val: AnyAtom & BaseAtomHelpers<unknown>) {
        this.value[key] = val;
      },
      setVersion(this: MapAtom, version: string) {
        this.version = version;
      },
      mutate(this: MapAtom, newValue: AtomMap) {
        this.value = newValue;
      },
      toJSON(this: MapAtom) {
        return {
          [this.identity.serialize()]: Object.keys(this.value).reduce(
            (res, key) => {
              const atom = this.value[key];
              return {
                ...res,
                ...atom.toJSON(),
              };
            },
            {},
          ),
        };
      },
      serialize(this: MapAtom, references: SerializedAtomWithReferences = {}) {
        for (const key in this.value) {
          const atom = this.value[key];
          const reference = atom.identity.serialize();
          if (reference in references) {
            throw new RuntimeError(
              "Cannot serialize atoms, with same identity: " + reference,
            );
          }

          references[key] = atom.serialize(references)[reference];
        }

        return {
          ...Object.keys(references).reduce((res, val) => {
            res[references[val].value.i] = references[val];
            return res;
          }, {} as Record<string, SerializedAtom>),
          [this.identity.serialize()]: {
            version: this.version,
            value: {
              i: this.identity.serialize(),
              t: this.valueKind,
              k: this.kind,
              v: Object.keys(this.value).reduce((res, val) => {
                res[val] = references[val].value.i;
                return res;
              }, {} as Record<string, string>),
            },
          },
        };
      },
      valueOf(this: MapAtom) {
        return this.value.valueOf() as AtomMap;
      },
    },
    molecule,
  );
}
