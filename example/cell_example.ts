import { assert } from "../assert.ts";
import {
  type ListAtom,
  type Molecule,
  type NamespacedIdentity,
  type NumberAtom,
  temporary as molecule,
} from "../mod.ts";

const johnAccount = molecule("ns://dev/accounts/john@doe.com").defaults({
  balance: 100,
  transactions: [],
});

const janeAccount = molecule("ns://dev/accounts/jane@doe.com").defaults({
  balance: 200,
  transactions: [],
});

await johnAccount.persist();
await janeAccount.persist();

const transactions = molecule("ns://dev/transactions");

const doTransfer = transactions.durable("do-transaction", async (ctx) => {
  await ctx.run("transfer", async () => {
    const from = ctx.get<NamespacedIdentity>("from");
    assert(typeof from === "string", "from must be string");

    const to = ctx.get<NamespacedIdentity>("to");
    assert(typeof to === "string", "to must be string");

    assert(from !== to, "from and to cannot be same account");

    const amount = ctx.get("amount");
    assert(typeof amount === "number", "amount must be number");

    const fromMolecule = await ctx.restore<Molecule>(from);

    assert(fromMolecule, "from must be molecule");
    const [fromBalance, fromTransactions] = fromMolecule.use<
      [NumberAtom, ListAtom]
    >("balance", "transactions");

    const toMolecule = await ctx.restore<Molecule>(to);
    assert(toMolecule, "to must be molecule");
    const [toBalance, toTransactions] = toMolecule.use<[NumberAtom, ListAtom]>(
      "balance",
      "transactions",
    );

    ctx.log(`before: ${from} balance: ${fromBalance.valueOf()}`);
    ctx.log(`before: ${to} balance: ${toBalance.valueOf()}`);

    if (fromBalance.value < amount) {
      throw new Error("not enough money");
    }

    fromBalance.mutate(fromBalance.value - amount);
    toBalance.mutate(toBalance.value + amount);

    ctx.log(`after: ${from} balance: ${fromBalance.valueOf()}`);
    ctx.log(`after: ${to} balance: ${toBalance.valueOf()}`);

    fromTransactions.add(ctx.identity);
    toTransactions.add(ctx.identity);

    await ctx.persist(fromMolecule, toMolecule); // transaction save
  });
});

const hmm = await doTransfer({
  from: johnAccount.identity,
  to: janeAccount.identity,
  amount: 100,
});

const restoredJane = await janeAccount.restore();
const restoredJohn = await johnAccount.restore();

console.log(hmm.toJSON({ pretty: true }));
console.log(restoredJane.toJSON({ pretty: true }));
console.log(restoredJohn.toJSON({ pretty: true }));
