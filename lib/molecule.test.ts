import { temporary } from "./molecule.ts";

Deno.test("molecule.atom", () => {
  const testUsers = temporary("test", "users");
  const usersNumberWithUlid = testUsers.number(123);
  const usersNumberWithName = testUsers.number(123, "age");
  // a gdyby robic sobie taki "commit log" i po prostu dac opcje persistu na calym organizmie?
  // testUsers.persist();
});

Deno.test("molecule.atom.persistence", async () => {
  const testUser = temporary("test", "users", "john@doe.com");
  const isMale = testUser.boolean(false, 'isMale');
  await isMale.persist();
  // console.log({testUser: isMale.serialize()});
})

Deno.test("molecule.persistence and molecule.restore", async () => {
  const testUser = temporary("test", "users", "john@doe.com");
  testUser.boolean(false, 'isMale');
  await testUser.persist()
  await temporary(...testUser.identity).restore();
  // console.log({testUser: testUser.serialize()});
})