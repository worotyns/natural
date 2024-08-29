import { atom, type NamespacedIdentity } from "../../mod.ts";
import { store } from "../../repository.ts";
import { assert } from "../../utils.ts";

Deno.test("user", async () => {
  interface Usr {
    activated: boolean;
    friends: NamespacedIdentity[];
  }

  interface MakeFriends {
    count: number;
  }

  const user1 = atom<Usr>("ns://users/jacek", { activated: true, friends: [] });
  const user2 = atom<Usr>("ns://users/damian", {
    activated: true,
    friends: [],
  });

  const makeFriend = atom<MakeFriends>("ns://make-friend/:ulid", {
    count: 0,
  });

  await makeFriend.do("make-friend", async (ctx) => {
    await ctx.step("check-all-are-active", async () => {
      assert(ctx.params.ids.length, "no ids given");
      assert(ctx.params.ids.length > 1, "must be more than 1 ids given");

      for (const id of ctx.params.ids) {
        const user = await atom<Usr>(id, { activated: true, friends: [] })
          .fetch();
        assert(user.value.activated, `user ${id} not activated`);
      }
    });

    await ctx.step("connect-firends", async (value) => {
      assert(ctx.params.ids.length, "no ids given");
      assert(ctx.params.ids.length > 1, "must be more than 1 ids given");

      for (const id of ctx.params.ids) {
        const user = await atom<Usr>(id, { activated: true, friends: [] })
          .fetch();

        for (const nextId of ctx.params.ids) {
          if (nextId !== id) {
            value.count++;
            await user.do("connect-to-user", async (usrCtx) => {
              await usrCtx.step("connect", (value) => {
                value.friends.push(nextId);
              });
            }, {});
          }
        }
        assert(user.value.activated, `user ${id} not activated`);
      }
    });
  }, {
    ids: [user1.nsid, user2.nsid],
  });

  console.log(store);
  // const user = await createOrRestoreUser({ email: 'a@a.com' });

  // await user.do('test-activity', async (ctx) => {

  //   await ctx.step('fetch', async () => {
  //     const fetched = await user.fetch();
  //     return fetched.value;
  //   })

  //   await ctx.step('update-sth', async (value) => {
  //     console.log(ctx.activity.activity.nsid);
  //     value.activities.push(ctx.activity.activity.nsid);
  //   })
  // }, {})

  // const fetched = await user.fetch();
  // console.log(fetched);

  // for (const activity of fetched.value.activities) {
  //   console.log(await atom(activity, {}).fetch());
  // }
  // console.log(store);
  // await activateUser(user.nsid);
  // const a = await activateUser(user.nsid);

  // console.log(a);
});
