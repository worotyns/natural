import { assert, assertEquals } from "@std/assert";
import { identity } from "./identity.ts";
import { atom } from "./mod.ts";
import type { Atom } from "./atom.ts";

type Sample = {
  sample: boolean;
};

Deno.test("atom and nested atom should be update in transaction", async () => {
  const test = atom<Sample>(identity("users/sample"), {
    sample: false,
  });

  let nestedAtom: Atom<Sample>;

  await test.do("sample-action", async (ctx) => {
    nestedAtom = ctx.atom<Sample>("nested", {
      sample: false,
    });

    await nestedAtom.do("sample", (ctx) => {
      ctx.value.sample = true;
    })

  });

  assert(nestedAtom!);
  assertEquals(nestedAtom.nsid, "ns://users/sample/nested");

  const sample1 = await atom(test.nsid, {}).fetch();
  const sample1nested = await atom(identity(test.nsid, 'nested'), {}).fetch();
  
  assertEquals(sample1.version, sample1nested.version);
});

Deno.test("atom with namespace - should be created not in current namespace but given one", async () => {
  const test = atom<Sample>(identity("users/:ulid"), {
    sample: false,
  });

  let aloneAtom: Atom<object>;

  await test.do("sample", async (ctx) => {
    aloneAtom = ctx.atom("ns://users/sample@alone.com", {});
  }, {});

  assert(aloneAtom!);
  assertEquals(aloneAtom.nsid, "ns://users/sample@alone.com");
});

Deno.test("atom with nested do ops should persis in one transaction all atoms and activities", async () => {
  const test = atom<Sample>(identity("users/:ulid"), {
    sample: false,
  });

  let activities = [];

  const act1 = await test.do("sample", async (ctx) => {
      ctx.value.sample = true;
      const next = ctx.atom<Sample>("next", {sample: false});
      const act2 = await next.do('sample-next', async (nextCtx) => {
        nextCtx.value.sample = true;
        const next2 = ctx.atom<Sample>("next2", {sample: false});
        const act3 = await next2.do('sample-next2', async (next2Ctx) => {
          next2Ctx.value.sample = true;
        })
        activities.push(act3)
      })
      activities.push(act2)
    }, {})

  activities.push(act1);

  const atomsInTransaction = await Promise.all([
    atom(test.nsid, {}).fetch(),
    atom(identity(test.nsid, 'next'), {}).fetch(),
    atom(identity(test.nsid, 'next2'), {}).fetch(),
  ])

  assert(activities.every(i => i.version === test.version));
  assert(atomsInTransaction.every(i => i.version === test.version));
});
