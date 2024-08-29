import { assertEquals } from "@std/assert";
import { identity } from "./identity.ts";
import { atom } from "./mod.ts";
import { AtomActivity } from "./atom.ts";

type Sample = {
  sample: boolean;
};

Deno.test("atom", async () => {
  const test = atom<Sample>(identity("users/sample"), {
    sample: false,
  });

  await test.do("sample-action", async (ctx) => {
    const nestedAtom = ctx.atom<Sample>("nested", {
      sample: false,
    });

    await nestedAtom.do("sample", (ctx) => {
      ctx.value.sample = true;
    })

    assertEquals(nestedAtom.nsid, "ns://users/sample/nested");
  });

  const sample1 = await atom(test.nsid, {}).fetch();
  const sample1nested = await atom(identity(test.nsid, 'nested'), {}).fetch();
  
  assertEquals(sample1.version, sample1nested.version);
});

// Deno.test("atom with namespace", async () => {
//   const test = atom<Sample>(identity("users/:ulid"), {
//     sample: false,
//   });

//   await test.do("sample", async (ctx) => {
//     const aloneAtom = ctx.atom("ns://users/sample@alone.com", {});
//     assertEquals(aloneAtom.nsid, "ns://users/sample@alone.com");
//   }, {});
// });
