import { identity } from "./identity.ts";
import { assert, assertEquals } from "./testing.ts";

Deno.test("identity", () => {
  assert(!identity("users/:ulid").endsWith(":ulid"));
  assert(!identity("ns://users/:ulid").endsWith(":ulid"));
  assert(identity("users/:ulid").startsWith("ns://"));
  assertEquals(
    identity("users", "sample", "email@wp.pl"),
    "ns://users/sample/email@wp.pl",
  );
});
