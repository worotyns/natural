import { createOrRestoreUser } from "./user.ts";

Deno.test('user', async () => {
  const user = await createOrRestoreUser({ email: 'a@a.com' });
  // await activateUser(user.nsid);
  // const a = await activateUser(user.nsid);
  
  // console.log(a);
})