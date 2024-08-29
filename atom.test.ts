import { assertEquals } from "@std/assert";
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
    assertEquals(nestedAtom.nsid, "ns://users/sample/nested");
  }, {});
});

Deno.test("atom with namespace", async () => {
  const test = atom<Sample>(identity("users/:ulid"), {
    sample: false,
  });

  await test.do("sample", async (ctx) => {
    const aloneAtom = ctx.atom("ns://users/sample@alone.com", {});
    assertEquals(aloneAtom.nsid, "ns://users/sample@alone.com");
  }, {});
});
