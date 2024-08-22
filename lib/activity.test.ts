import { activity } from "./activity.ts";
import { assertEquals } from "./testing.ts";
import { memoryRuntime } from "./runtime.ts";
import { createRepository } from "./repository.ts";

Deno.test("activity", async () => {
  const testing = createRepository(memoryRuntime);

  const a = activity("user-created", { uid: ["users", "jane@email.com"] });
  const b = activity("user-created", { uid: ["users", "jane1@email.com"] });

  await testing.log.add(a, b);

  const result = await testing.log.scan(a.identity);

  assertEquals(
    result,
    [
      a.value,
      b.value,
    ],
  );
});
