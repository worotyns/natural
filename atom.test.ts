import { type Atom, atom } from "./mod.ts";
import { assertEquals } from "./deps.ts";
import { testing } from "./example/testing.ts";
import { assert } from "./utils.ts";

Deno.test("atom", async () => {
  const sample = atom<string[]>("sample", []);
  assertEquals(sample.name, "sample");
  assertEquals(sample.value, []);
  assertEquals(sample.version, "");
  assertEquals(sample.identity, ["sample"]);
  assertEquals(sample.wasModified(), false);

  sample.mutate(["as"]);
  assertEquals(sample.wasModified(), true);

  await testing.repository.persist(sample);
  const restored = await testing.repository.restore<Atom<string[]>>(["sample"]);

  assert(restored, "restored is null");

  assertEquals(restored.name, "sample");
  assertEquals(restored.value, ["as"]);
  assert(restored.version !== "", "version was assigned");
  assertEquals(restored.identity, ["sample"]);
  assertEquals(restored.wasModified(), false);
  restored.mutate(["as", "sa"]);
  assertEquals(restored.wasModified(), true);
});
