import { assertEquals } from "@std/assert";
import { and, combine, flags, has, or } from "../lib/permission.ts";

Deno.test("permission", () => {
  const def = [
    "payments.read",
    "payments.create",
    "payments.update",
    "payments.delete",
    "payments.accept",
    "payments.admin",
  ] as const;

  const myflags = flags<typeof def>(def);

  assertEquals(
    myflags,
    new Map<unknown, number>([
      ["payments.read", 1],
      ["payments.create", 2],
      ["payments.update", 4],
      ["payments.delete", 8],
      ["payments.accept", 16],
      ["payments.admin", 32],
    ]),
  );

  assertEquals(myflags.get("payments.read"), 1, "flags are working");
  assertEquals(myflags.get("payments.create"), 2, "flags are working");

  const role = 3; // read, create

  assertEquals(
    combine(myflags.get("payments.create")!, myflags.get("payments.read")!),
    role,
    "combine works",
  );

  assertEquals(has(role, myflags.get("payments.read")!), true, "has works");
  assertEquals(has(role, myflags.get("payments.create")!), true, "has works");
  assertEquals(has(role, myflags.get("payments.delete")!), false, "has works");

  const myRole = combine(
    myflags.get("payments.create")!,
    myflags.get("payments.delete")!,
  );
  assertEquals(
    or(
      myRole,
      myflags.get("payments.admin")!,
      and(
        myRole,
        myflags.get("payments.create")!,
        myflags.get("payments.delete")!,
      ),
    ),
    true,
    "or works",
  );
});
