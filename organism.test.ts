import { assertEquals } from "./deps.ts";
import { testing } from "./example/testing.ts";
import { organism } from "./organism.ts";

Deno.test('organism.atom', () => {
  const my = organism(['dev'], testing);
  const myAtom = my.atom('item', 123);

  assertEquals(myAtom.identity, ['item'], 'should not combine identifiers for atom');
  assertEquals(myAtom.name, 'item');
  assertEquals(myAtom.value, 123);
})

Deno.test('organism.molecule', () => {
  const my = organism(['dev'], testing);
  const myMol = my.molecule(['users', 'matias@eu.pl'], [
    my.atom('name', 'matias'),
  ]);

  assertEquals(myMol.identity, ['dev', 'users', 'matias@eu.pl'], 'should combine identifiers for molecule');
})

Deno.test('organism.cell', async () => {
  const my = organism(['dev'], testing);
  const myCell = my.cell(['durable_counter'], (ctx) => {
    ctx.set('calls', (ctx.get<number>('calls') || 0) + 1);
    ctx.run(['sample'], (ctx) => {
      const current = ctx.get<number>('count') || 0;
      ctx.set('count', current + 1);
      return Promise.resolve();
    })

    return Promise.resolve()
  });

  const results = await myCell({});
  const results2 = await myCell({}, results);

  const [kv] = results2.use('kv');
  assertEquals(kv.value.count, 1);
  assertEquals(kv.value.calls, 2);
})