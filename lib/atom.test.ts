import { assertEquals } from "../deps.ts";
import * as atom from "./atom.ts";
import { identity } from "./identity.ts";
import { PrimitiveValue } from "./primitive.ts";

Deno.test("atom.string", () => {
  const numAtm = atom.string('1', identity('a', 'b'));
  numAtm.mutate('3');
  assertEquals(numAtm.value, '3');
  assertEquals(numAtm.serialize(), {
    [numAtm.identity.serialize()]: {
      k: PrimitiveValue.String,
      v: '3',
      i: numAtm.identity.serialize()
    }
  });
  assertEquals(numAtm.valueOf(), '3');
});

Deno.test("atom.date", () => {
  const date = new Date('2022-01-01');
  const numAtm = atom.date(date, identity('a', 'b'));
  assertEquals(numAtm.value, date);
  assertEquals(numAtm.serialize(), {
    [numAtm.identity.serialize()]: {
      k: PrimitiveValue.Date,
      v: date.toISOString(),
      i: numAtm.identity.serialize()
    }
  });
});


Deno.test("atom.number", () => {
  const numAtm = atom.number(1, identity('a', 'b'));
  numAtm.mutate(3);
  assertEquals(numAtm.value, 3);
  assertEquals(numAtm.serialize(), {
    [numAtm.identity.serialize()]: {
      k: PrimitiveValue.Number,
      v: 3,
      i: numAtm.identity.serialize()
    }
  });
  assertEquals(numAtm.valueOf(), 3);
});

Deno.test("atom.boolean", () => {
  const boolAtm = atom.boolean(false, identity('a', 'b'));
  boolAtm.mutate(true);
  assertEquals(boolAtm.value, true);
  boolAtm.toggle();
  assertEquals(boolAtm.value, false);
  boolAtm.positive();
  assertEquals(boolAtm.value, true);
  boolAtm.negative();
  assertEquals(boolAtm.value, false);
  assertEquals(boolAtm.serialize(), {
    [boolAtm.identity.serialize()]: {
      k: PrimitiveValue.Boolean,
      v: false,
      i: boolAtm.identity.serialize()
    }
  });
});

Deno.test("atom.list", () => {
  const listAtm = atom.list([], identity('a', 'coll'));
  listAtm.mutate([1, 'a', true, {}]);
  assertEquals(listAtm.serialize(), {
    [listAtm.identity.serialize()]: {
      i: listAtm.identity.serialize(),
      k: PrimitiveValue.List,
      v: [ 1, 'a', true, {} ]
    }
  });
});

Deno.test("atom.collection", () => {
  const numAtm = atom.boolean(false, identity('a', 'coll', '1'));
  const collAtm = atom.list(['a'], identity('a', 'coll'));
  const collAtm2 = atom.collection([], identity('a', 'coll2'));
  
  collAtm2.mutate([numAtm, collAtm]);

  assertEquals(collAtm2.serialize(), {
    [numAtm.identity.serialize()]: {
      i: numAtm.identity.serialize(),
      k: PrimitiveValue.Boolean,
      v: numAtm.valueOf()
    },

    [collAtm.identity.serialize()]: {
      i: collAtm.identity.serialize(),
      k: PrimitiveValue.List,
      v: collAtm.valueOf()
    },

    [collAtm2.identity.serialize()]: {
      i: collAtm2.identity.serialize(),
      k: PrimitiveValue.Collection,
      v: [ numAtm.identity.serialize(), collAtm.identity.serialize() ]
    }
  });
});

Deno.test("atom.map", () => {
  const mapAtm = atom.map({}, identity('a', 'map'));
  const numAtm = atom.number(1, identity('a', 'map', 'hm'));
  mapAtm.set('hm', numAtm);

  assertEquals(mapAtm.serialize(), {
       [mapAtm.identity.serialize()]: {
         i: mapAtm.identity.serialize(),
         k: 6,
         v: {
           hm: numAtm.identity.serialize(),
         },
       },
       [numAtm.identity.serialize()]: {
         i: numAtm.identity.serialize(),
         k: 1,
         v: 1,
       },
     });
});