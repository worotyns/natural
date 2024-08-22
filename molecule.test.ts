import { atom } from "./atom.ts";
import { assert, assertEquals } from "./deps.ts";
import { testing } from "./example/testing.ts";
import { type Molecule, molecule } from "./molecule.ts";

Deno.test("molecule", async () => {
  const mymol = molecule(["users", "jane@email.com"], [
    atom("friends", []),
    atom("name", "Jane"),
    atom("age", 18),
  ]);

  await testing.repository.persist(mymol);

  const restored = await testing.repository.restore<Molecule>([
    "users",
    "jane@email.com",
  ]);
  assert(restored, "restored is null");

  assertEquals(restored.serialize(), mymol.serialize());
  assert(restored.version !== "", "version is empty");

  const [name] = restored.use("name");

  assertEquals(name.name, "name");
  assertEquals(name.value, "Jane");

  assertEquals(restored.wasModified(), false);
  name.mutate("John");
  assertEquals(name.wasModified(), true);
  assertEquals(restored.wasModified(), true);
});

Deno.test("molecule.partialyRestored", async () => {
  const mymol = molecule(["users", "jane@email.com"]);
  moMol.addAtom("name", "Jane");
  mymol.atom("name").mutate();
  mymol.atoms("name", "age").map((i) => i.mutate());
});
