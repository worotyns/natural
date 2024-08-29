import { identity } from "./identity.ts";
import { atom } from "./mod.ts";

type Sample = {
  sample: boolean;
};

Deno.test("atom", async () => {
  const test = atom<Sample>(identity("users/:ulid"), {
    sample: false,
  });

  await test.do("sample", async (ctx) => {
    const nestedAtom = ctx.atom("nested", {});
    console.log(nestedAtom);
  }, {});
});

Deno.test("atom with namespace", async () => {
  const test = atom<Sample>(identity("users/:ulid"), {
    sample: false,
  });

  await test.do("sample", async (ctx) => {
    const aloneAtom = ctx.atom("ns://users/sample@alone.com", {});
    console.log(aloneAtom);
  }, {});
});
