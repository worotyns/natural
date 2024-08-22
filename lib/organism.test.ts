import { identity } from "./identity.ts";
import { memory } from "./organism.ts";

Deno.test("organism.atom", () => {
  const testUsersOrganism = memory(identity("test", "users"));
  
  const usersNumberWithUlid = testUsersOrganism.number(123);
  const usersNumberWithName = testUsersOrganism.number(123, "age");

  // a gdyby robic sobie taki "commit log" i po prostu dac opcje persistu na calym organizmie?
  // testUsersOrganism.persist();
});
