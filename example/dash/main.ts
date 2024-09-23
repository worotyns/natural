declare const Client: any;
// Should be responsible for auth, routing, commands builder, and docs builder, maybe cli builder in future
// Should be able to join with websockets via wrappers, plugins or sth
Client
  .for('ns://users/*', p => 
    p
    .on(
      cmd => [
        cmd
          .filter(ctx => ctx.state === 'waiting_for_manual_accept')
          .withPermission(PermissionFlags.Admin)
          .name('accept', arg => [
            arg
              .boolean('Accept')
              .description('Check if you accept this account')
              .default(false)
            ]
          )
          .description('Manual accepts client')
          .do(() => {}),
        cmd
          .filter(ctx => ctx.state === 'accepted')
          .name('delete', arg => [
            arg
              .text('')
              .description('Write user email for confirmation this action')
              .default('')
              .validate((ctx, value) => ctx.email === value, 'Not match') // valibot maybe better for this
              .do(() => {}),
          ]
        )
      ]
    )
  )
  