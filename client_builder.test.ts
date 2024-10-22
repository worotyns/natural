import { ClientBuilder } from "./client_builder.ts";
import { flags } from "./permission.ts";

const roles = [
  "superuser",
  "user",
] as const;

export const userRoles = flags<typeof roles>(roles);

interface User {
  created_at: number;
  name: string;
  accepted: boolean;
}

interface CreateUser {
  name: string;
}

interface AcceptUser {
  name: string;
  who: string;
}

Deno.test('client_builder', async () => {
  const client = ClientBuilder
    .builder()
    // .service('email', emailService)
    .command<CreateUser, User>('register', cmd => cmd
      .description('Register new user')
      .arguments(arg => [
        arg.string('name'),
        arg.boolean('terms').default(false),
      ])
      .behaviour(async (command, atom) => {
        command.name
        atom.activity.log('User created');
      })
    )
    .command<AcceptUser, User>('admin_accept_user', cmd => cmd
      .description('Manual accepts client')
      .metadata(meta => 
        meta
          .namespace('ns://users/:ulid')
          .permissions(userRoles.get('superuser')!) // hm? second arg can be optional
      )
      .arguments(arg => [
        arg
          .boolean('accept')
          .description('Check if you accept this account')
          // .check(() => true),
          .default(false)
        ]
      )
      .behaviour(async (ctx, atom) => {
        
      }),
  )
  .build()

  console.log(client);
})