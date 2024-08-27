import { type Context, Hono } from "jsr:@hono/hono@^4.5.9";
import { jwt, type JwtVariables, sign } from "jsr:@hono/hono/jwt";

// local import normaly from jsr:@worotyns/normal;
import { env, type ObjectAtom, type StringAtom } from "../../mod.ts";
import { assert } from "../../assert.ts";

const authorization = env("ns://auth");

const authorizationFlow = authorization.durable("auth-via-email-with-code", async (ctx) => {
  await ctx.run('send-code-step', async () => {
    // todo: check that user exists fake
    const ctxUser = ctx.get<string>('user');
    // ctx.restore..
    assert(ctxUser, 'user must exsits');

    const code = Math.floor(100000 + Math.random() * 900000);
    ctx.set('generatedCode', code);
    console.log('dummy sending code via sms or email: ', code, ' for user ', ctxUser);
  });

  await ctx.waitFor('givenCode');

  await ctx.run('generate-jwt-step', async () => {
    const givenCode = ctx.get<number>('givenCode');
    assert(givenCode, 'givenCode must be number');
    
    const generatedCode = ctx.get<number>('generatedCode');
    assert(generatedCode, 'generatedCode must be number');

    const expHours = ~~(ctx.get<number>("expireHours") || 10);
    assert(expHours, 'expireHours must be number');

    assert(givenCode === generatedCode, 'givenCode and generateCode must be equal');

    const ctxUser = ctx.get<string>('user');
    // check is not blocked or sth
    assert(ctxUser, 'user must exsits');

    const generatedToken = await sign({
      user: ctxUser,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (3600 * expHours),
    }, JWT_SECRET);

    ctx.set('generatedToken', generatedToken);
  });

  await ctx.waitFor('generatedToken');
});

export const app = new Hono<{ Variables: JwtVariables }>();
const JWT_SECRET = Deno.env.get("JWT_SECRET") || "my-very-very-secret-variable";

export const assertIsAuthorized = jwt({
  secret: JWT_SECRET,
});

app.post("/auth/sign", async (c) => {
  const data = await c.req.json();

  // start flow return ns://
  const expireHours = ~~(c.req.query("expire_hours") || 10);
  const response = await authorizationFlow({
    user: `ns://users/${data.email}`,
    expireHours: expireHours,
  });

  const [ status ] = response.use('status');

  return c.json({
    nsid: response.identity,
    status: status.valueOf()
  });
  
});

app.post("/auth/confirm", async (c) => {
  const data = await c.req.json();

  const response = await authorizationFlow({
    givenCode: data.code,
  }, await env(data.nsid).restore());

  const [status, kv] = response.use<[StringAtom, ObjectAtom]>('status', 'kv');

  return c.json({
    response: status,
    jwt: kv.valueOf()['generatedToken']
  });
});

app.get("/auth/authorized", assertIsAuthorized, (c: Context) => {
  return c.json(c.get("jwtPayload"));
});
