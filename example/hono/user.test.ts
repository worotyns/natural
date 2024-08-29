import { atom } from "../../mod.ts";
import { assert } from "../../testing.ts";
import { createOrRestoreUser } from "./user.ts";

Deno.test("user", async () => {
  const testUser = await createOrRestoreUser({
    email: "mati@wp.pl",
  });

  const restored = await atom(testUser.nsid, {}).fetch();
  assert(restored.version === testUser.version);
});
