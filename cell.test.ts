import { cell } from "./cell.ts";
import { identity } from "./identity.ts";
import { createRepository } from "./repository.ts";
import { memoryRuntime } from "./runtime.ts";
import { assertEquals } from "./testing.ts";

Deno.test("cell", async () => {
  const repository = createRepository(memoryRuntime);

  const myCell = cell(identity("durable_counter"), (ctx) => {
    ctx.set("calls", (ctx.get<number>("calls") || 0) + 1);

    ctx.run(identity("sample"), (ctx) => {
      const current = ctx.get<number>("count") || 0;
      ctx.set("count", current + 1);
      return Promise.resolve(123);
    });

    return Promise.resolve();
  }, repository);

  const results = await myCell({});
  const results2 = await myCell({}, results);

  assertEquals(results.identity.key.length, 2);
  assertEquals(
    results.identity.key.slice(0, 1),
    ["durable_counter"],
    "adds organism identifier",
  );

  const [kv] = results2.use("kv");
  assertEquals(kv.value.count, 1);
  assertEquals(kv.value.calls, 2);
});
