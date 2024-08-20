import { cell } from "./cell.ts";
import { assertEquals } from "./deps.ts";
import { testing } from "./example/testing.ts";

Deno.test("cell", async () => {
  const myCell = cell(["durable_counter"], (ctx) => {
    ctx.set("calls", (ctx.get<number>("calls") || 0) + 1);
    ctx.run(["sample"], (ctx) => {
      const current = ctx.get<number>("count") || 0;
      ctx.set("count", current + 1);
      return Promise.resolve();
    });

    return Promise.resolve();
  }, testing);

  const results = await myCell({});
  const results2 = await myCell({}, results);

  assertEquals(results.identity.length, 2);
  assertEquals(
    results.identity.slice(0, 1),
    ["durable_counter"],
    "adds organism identifier",
  );

  const [kv] = results2.use("kv");
  assertEquals(kv.value.count, 1);
  assertEquals(kv.value.calls, 2);
});
