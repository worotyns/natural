import { temporary } from "./molecule.ts";
import { assertEquals } from "./testing.ts";

Deno.test("molecule.atom", () => {
  // const testUsers = temporary("test", "users");
  // const usersNumberWithUlid = testUsers.number(123);
  // const usersNumberWithName = testUsers.number(123, "age");
  // a gdyby robic sobie taki "commit log" i po prostu dac opcje persistu na calym organizmie?
  // testUsers.persist();
});

Deno.test("molecule.persistence and molecule.restore", async () => {
  const testUser = temporary("test", "users", "john@doe.com");
  testUser.boolean(false, "isMale");
  testUser.number(22, "age");
  testUser.object({ ha: 123 });
  await testUser.persist();
  const mol = await temporary(...testUser.identity).restore();
  assertEquals(mol.serialize(), testUser.serialize());
});
