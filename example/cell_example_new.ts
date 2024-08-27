import { assert } from "../assert.ts";
import {
  ListAtom,
  Molecule,
  NamespacedIdentity,
  NumberAtom,
  temporary,
} from "../mod.ts";

const johnAccount = temporary("ns://dev/accounts/john@doe.com").defaults({
  balance: 100,
});

const janeAccount = temporary("ns://dev/accounts/john@doe.com").defaults({
  balance: 200,
});

const transactions = temporary("ns://dev/transactions");

const doTransfer = transactions.durable("do-transaction", async (ctx) => {
  await ctx.run("transfer", async () => {
    const from = ctx.get<NamespacedIdentity>("from");
    assert(typeof from === "string", "from must be string");

    const to = ctx.get<NamespacedIdentity>("to");
    assert(typeof to === "string", "to must be string");

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

    if (fromBalance.value < amount) {
      throw new Error("not enough money");
    }

    fromBalance.mutate(fromBalance.value - amount);
    toBalance.mutate(toBalance.value + amount);

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

console.log(hmm.toJSON({ pretty: true }));
