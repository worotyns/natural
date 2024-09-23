import { ClientBuilder } from "./client_builder.ts";
import { atom } from "./mod.ts";
import { flags } from "./permission.ts";

const roles = [
  "superuser",
  "user",
] as const;

export const userRoles = flags<typeof roles>(roles);

Deno.test('client_builder', async () => {
  ClientBuilder
    .builder()
    .command('register', cmd => cmd
      .description('Register new user')
      .arguments(arg => [
        arg.string('name'),
        arg.boolean('terms').default(false),
      ])
      .do(async (ctx) => {
        
      })
    )
    .command('admin_accept_user', cmd => cmd
      .description('Manual accepts client')
      .namespace('ns://users/*') // how to solve dynamic values like tenant? with jwt
      .permission(userRoles.get('superuser')!) // hm? second arg can be optional
      .arguments(arg => [
        arg
          .boolean('accept')
          .description('Check if you accept this account')
          .default(false)
        ]
      )
      .do(async (ctx) => {}),
  )
})

// const user = Atom.declare('ns://users/:ulid', {})
// A moze powinnien byc atombuilder? i klient tworzony z atomow? a atom mialby behaviour na sobie


// Client 
//        -> HanoFactory (api, swagger)
//        -> WebsocketFactory (markdown, ws)
//        -> LocalFactory (just test promise client)

