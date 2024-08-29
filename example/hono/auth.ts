import { type Context, Hono } from "jsr:@hono/hono@^4.5.9";
import { jwt, type JwtVariables, sign } from "jsr:@hono/hono/jwt";

// local import normaly from jsr:@worotyns/normal;
import { atom, type NamespacedIdentity } from "../../mod.ts";
import { assert } from "../../utils.ts";

interface AuthorizationViaEmailWithCode {
  user: string;
  code: number;
  emailSent: boolean;
  expireHours: number;
  jwt: string;
}

const AUTH_DEFAULT_VALUES: AuthorizationViaEmailWithCode = {
  user: "",
  code: 0,
  emailSent: false,
  expireHours: 6,
  jwt: "",
};

interface StartSignProcess {
  email: string;
  expireHours: number;
}

interface CheckCodeProcess {
  nsid: NamespacedIdentity;
  code: number;
}

const services = {
  generateCode(): Promise<number> {
    return Promise.resolve(Math.floor(100000 + Math.random() * 900000));
  },
  async sendEmail(email: string, code: number): Promise<boolean> {
    console.log("sending email...", email, code);
    await new Promise((resolve) => setTimeout(resolve, 120));
    return true;
  },
};

const generateCodeAndSend = async (params: StartSignProcess) => {
  const authorization = atom<AuthorizationViaEmailWithCode>(
    "ns://authorization/:ulid",
    AUTH_DEFAULT_VALUES,
  );

  const activity = await authorization.do('auth-code-gen-and-send', async (ctx) => {
    await ctx.step("user", async (value) => {
      // todo create identity helpers
      value.user = `ns://users/${params.email}`;
      // fetch user, and check bla bla bla
      ctx.activity.log("set user: " + value.user);
    });

    await ctx.step("code", async (value) => {
      value.code = await services.generateCode();
      value.expireHours = ctx.params.expireHours || 6;
    });

    await ctx.step("email", async (value) => {
      ctx.activity.log("sending email with code" + ctx.value.code);
      await services.sendEmail(ctx.params.email, ctx.value.code);
      value.emailSent = true;
      ctx.activity.log("email sent!");
      ctx.activity.success("email", { status: "sent" });
    });
  }, params);

  return {
    nsid: authorization.nsid,
    success: activity.value.results.code.success,
  };
};

const checkCodeAndGenerateJWT = async (params: CheckCodeProcess) => {
  const authorization = atom<AuthorizationViaEmailWithCode>(
    params.nsid,
    AUTH_DEFAULT_VALUES,
  );
  const activity = await authorization.do('auth-check-code-and-gen-jwt', async (ctx) => {
    ctx.activity.log("try to generate jwt");

    assert(
      ctx.params.code === ctx.value.code,
      "givenCode and code must be equal",
    );

    const ctxUser = ctx.value.user;
    // check is not blocked or sth
    // assert(ctxUser, "user must exsits");

    const jwt = await sign({
      user: ctxUser,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (3600 * ctx.value.expireHours),
    }, JWT_SECRET);

    ctx.activity.log("jwt generated");

    await ctx.step("jwt", (value) => {
      value.jwt = jwt;
    });

    ctx.activity.success("jwt", { jwt });
  }, params);

  return {
    nsid: authorization.nsid,
    success: activity.value.results.jwt.success,
    jwt: authorization.value.jwt,
  };
};

export const app = new Hono<{ Variables: JwtVariables }>();

const JWT_SECRET = Deno.env.get("JWT_SECRET") ||
  "my-very-very-secret-variable-used-as-jwt-secret";

export const assertIsAuthorized = jwt({
  secret: JWT_SECRET,
});

app.post("/auth/sign", async (c) => {
  const data = await c.req.json();

  const expireHours = ~~(c.req.query("expire_hours") || 10);

  const response = await generateCodeAndSend({
    email: data.email,
    expireHours: expireHours,
  });

  return c.json(response);
});

app.post("/auth/confirm", async (c) => {
  const data = await c.req.json();

  const response = await checkCodeAndGenerateJWT({
    nsid: data.nsid,
    code: data.code,
  });

  return c.json(response);
});

app.get("/auth/authorized", assertIsAuthorized, (c: Context) => {
  return c.json(c.get("jwtPayload"));
});
