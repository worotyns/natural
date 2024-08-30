import { atom } from "../../mod.ts";
import { clearStorage } from "../../repository.ts";
import { assert, assertEquals } from "../../testing.ts";
import { createJwtToken } from "./jwt.ts";
import { app, createOrRestoreUser, userRoles } from "./user.ts";

Deno.test("user", async () => {
  await clearStorage();

  const testUser = await createOrRestoreUser({
    email: "mati@wp.pl",
  });

  const restored = await atom(testUser.nsid, {}).fetch();
  assert(restored.version === testUser.version);
});

Deno.test('/users/me', async () => {
  await createOrRestoreUser({email: 'a@a.com'});

  const jwt = await createJwtToken({
    user: "ns://users/a@a.com",
    email: "a@a.com",
    role: userRoles.get('user')!,
    expireHours: 1,
  });

  const getUser = await app.request("/users/me", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${jwt}`,
    },
  });

  const getUserResponse = await getUser.json();
  
  assertEquals(getUser.status, 200);
  assertEquals(getUserResponse.email, "a@a.com");
  assertEquals(getUserResponse.name, "");

  const editUserName = await app.request("/users/me", {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${jwt}`,
    },
    body: JSON.stringify({
      name: "my-name",
    }),
  });

  const editUserNameResponse = await editUserName.json();

  assertEquals(editUserName.status, 200);
  assertEquals(editUserNameResponse.email, "a@a.com");
  assertEquals(editUserNameResponse.name, "my-name");

})