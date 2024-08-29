import { atom } from "../mod.ts";

interface User {
  name: string;
  activated: boolean;
  age: number;
}

const user = atom<User>("ns://users/john@edu.pl", {
  name: "",
  age: 0,
  activated: false,
});

const activity = await user.do('create-user', async (atomContext) => {
  await atomContext.step("example-step", (newValue) => {
    newValue.activated = true;
    newValue.name = "John";
    newValue.age = 13;
  });
}, {});

console.log(Deno.inspect({user, activity}, {colors: true, depth: 10}));