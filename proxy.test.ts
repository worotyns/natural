import { assertEquals } from "@std/assert";
import { createMonitoredObject } from "./proxy.ts";
import { assert } from "./utils.ts";

Deno.test('proxy', () => {
  const original = {
    a: 1,
    b: {
        x: 2,
        y: [1, 2, 3]
    },
    c: [4, 5, 6]
  };

  const cloned = structuredClone(original);

  const changes: any[] = [];
  const monitoredObject = createMonitoredObject(cloned, (operation: string, prop: string, newValue: unknown, oldValue: unknown) => {
    changes.push(`${prop} = ${newValue}`)
  });

  // Test updates
  monitoredObject.a = 10;              // Logs: set operation on property "a": oldValue = 1, newValue = 10
  monitoredObject.b.x = 20;            // Logs: set operation on property "x": oldValue = 2, newValue = 20
  monitoredObject.b.y.push(4);         // Logs: set operation on property "3": oldValue = undefined, newValue = 4 (for the push operation)
  delete monitoredObject.c[1];         // Logs: delete operation on property "1": oldValue = 5, newValue = undefined

  assertEquals(cloned, {
    a: 10,
    b: {
        x: 20,
        y: [1, 2, 3, 4]
    },
    c: [4, , 6]
  })

  assertEquals(changes, [
     "a = 10",
     "b.x = 20",
     "b.y.3 = 4",
     "c.1 = undefined",
  ])
})