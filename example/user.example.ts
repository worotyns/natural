/////////////// Example

import { RuntimeError } from "../errors.ts";
import { atom, scan } from "../mod.ts";

interface User {
  name: string;
  maried: boolean;
  activated: boolean;
  age: number;
}

const user = atom<User>("ns://users/john@edu.pl", {
  name: "",
  age: 0,
  maried: false,
  activated: false,
});

await user.do(async (ctx) => {
  ctx.activity.type("create-user");

  if (ctx.value.activated) {
    throw new RuntimeError("Cannot activate already activated user");
  }

  ctx.activity.log("before action activated");
  await new Promise((resolve) => setTimeout(resolve, 10));
  ctx.activity.log("user activated");

  ctx.mutate((value) => {
    value.activated = true;
    value.name = "John";
    value.age = 13;
  });
});

console.log(user);

const items = await scan('ns://activity', 'ns://');
console.log({items});