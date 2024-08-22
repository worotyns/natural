import { activity } from "./activity.ts";
import { assertEquals } from "./testing.ts";
import { testing } from "../example/testing.ts";

Deno.test("activity", async () => {
  const a = activity("user-created", { uid: ["users", "jane@email.com"] });
  const b = activity("user-created", { uid: ["users", "jane1@email.com"] });

  await testing.activity.add(a, b);

  const result = await testing.activity.scan(a.identity);

  assertEquals(
    result,
    [
      a.value,
      b.value,
    ],
  );
});
