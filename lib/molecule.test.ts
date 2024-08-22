import { memory as molecule } from "./molecule.ts";

Deno.test("molecule.atom", () => {
  const testUsersOrganism = molecule('test', 'users');
  const usersNumberWithUlid = testUsersOrganism.number(123);
  const usersNumberWithName = testUsersOrganism.number(123, "age");
  // a gdyby robic sobie taki "commit log" i po prostu dac opcje persistu na calym organizmie?
  // testUsersOrganism.persist();
});