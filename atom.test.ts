import { assertEquals } from "./testing.ts";
import * as atom from "./atom.ts";
import { identity } from "./identity.ts";
import { PrimitiveKind, PrimitiveValue } from "./primitive.ts";

Deno.test("atom.string", () => {
  const numAtm = atom.string("1", identity("a", "b"));
  numAtm.mutate("3");
  assertEquals(numAtm.value, "3");
  assertEquals(numAtm.serialize(), {
    [numAtm.identity]: {
      version: "",
      value: {
        t: PrimitiveValue.String,
        k: PrimitiveKind.Atom,
        v: "3",
        i: numAtm.identity,
      },
    },
  });
  assertEquals(numAtm.valueOf(), "3");
});

Deno.test("atom.date", () => {
  const date = new Date("2022-01-01");
  const numAtm = atom.date(date, identity("a", "b"));
  assertEquals(numAtm.value, date);
  assertEquals(numAtm.serialize(), {
    [numAtm.identity]: {
      version: "",
      value: {
        t: PrimitiveValue.Date,
        k: PrimitiveKind.Atom,
        v: date.toISOString(),
        i: numAtm.identity,
      },
    },
  });
});

Deno.test("atom.number", () => {
  const numAtm = atom.number(1, identity("a", "b"));
  numAtm.mutate(3);
  assertEquals(numAtm.value, 3);
  assertEquals(numAtm.serialize(), {
    [numAtm.identity]: {
      version: "",
      value: {
        t: PrimitiveValue.Number,
        k: PrimitiveKind.Atom,
        v: 3,
        i: numAtm.identity,
      },
    },
  });
  assertEquals(numAtm.valueOf(), 3);
});

Deno.test("atom.boolean", () => {
  const boolAtm = atom.boolean(false, identity("a", "b"));
  boolAtm.mutate(true);
  assertEquals(boolAtm.value, true);
  boolAtm.toggle();
  assertEquals(boolAtm.value, false);
  boolAtm.positive();
  assertEquals(boolAtm.value, true);
  boolAtm.negative();
  assertEquals(boolAtm.value, false);
  assertEquals(boolAtm.serialize(), {
    [boolAtm.identity]: {
      version: "",
      value: {
        t: PrimitiveValue.Boolean,
        k: PrimitiveKind.Atom,
        v: false,
        i: boolAtm.identity,
      },
    },
  });
});

Deno.test("atom.list", () => {
  const listAtm = atom.list([], identity("a", "coll"));
  listAtm.mutate([1, "a", true, {}]);
  assertEquals(listAtm.serialize(), {
    [listAtm.identity]: {
      version: "",
      value: {
        i: listAtm.identity,
        t: PrimitiveValue.List,
        k: PrimitiveKind.Atom,
        v: [1, "a", true, {}],
      },
    },
  });
});

Deno.test("atom.collection", () => {
  const numAtm = atom.boolean(false, identity("a", "coll", "1"));
  const collAtm = atom.list(["a"], identity("a", "coll"));
  const collAtm2 = atom.collection([], identity("a", "coll2"));

  collAtm2.mutate([numAtm, collAtm]);

  assertEquals(collAtm2.serialize(), {
    [numAtm.identity]: {
      version: "",
      value: {
        i: numAtm.identity,
        t: PrimitiveValue.Boolean,
        k: PrimitiveKind.Atom,
        v: numAtm.valueOf(),
      },
    },

    [collAtm.identity]: {
      version: "",
      value: {
        i: collAtm.identity,
        t: PrimitiveValue.List,
        k: PrimitiveKind.Atom,
        v: collAtm.valueOf(),
      },
    },

    [collAtm2.identity]: {
      version: "",
      value: {
        i: collAtm2.identity,
        t: PrimitiveValue.Collection,
        k: PrimitiveKind.Atom,
        v: [numAtm.identity, collAtm.identity],
      },
    },
  });
});

Deno.test("atom.map", () => {
  const mapAtm = atom.map({}, identity("a", "map"));
  const numAtm = atom.number(1, identity("a", "map", "hm"));
  mapAtm.set("hm", numAtm);

  assertEquals(mapAtm.serialize(), {
    [mapAtm.identity]: {
      version: "",
      value: {
        i: mapAtm.identity,
        t: PrimitiveValue.Map,
        k: PrimitiveKind.Atom,
        v: {
          hm: numAtm.identity,
        },
      },
    },
    [numAtm.identity]: {
      version: "",
      value: {
        i: numAtm.identity,
        t: PrimitiveValue.Number,
        k: PrimitiveKind.Atom,
        v: 1,
      },
    },
  });
});
