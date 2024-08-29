import { type Context, Hono } from "jsr:@hono/hono@^4.5.9";
import { type JwtVariables, sign } from "jsr:@hono/hono/jwt";

// local import normaly from jsr:@worotyns/normal;
import { atom, type NamespacedIdentity } from "../../mod.ts";
import { InvalidStateError } from "../../errors.ts";
import { services } from "./services.ts";
import { createOrRestoreUser, userRoles } from "./user.ts";
import { assertHasRole, assertIsAuthorized, JWT_SECRET } from "./jwt.ts";

interface AuthorizationViaEmailWithCode {
  user: string;
  code: number;
  codeExpiresAt: number;
  email: string;
  emailSentAt: number;
  expireHours: number;
  jwt: string;
}

const AUTH_DEFAULT_VALUES: AuthorizationViaEmailWithCode = {
  user: "",
  email: "",
  codeExpiresAt: 0,
  code: 0,
  emailSentAt: 0,
  expireHours: 6,
  jwt: "",
};

interface StartSignProcess {
  email: string;
  expireHours: number;
}

interface ResendCodeForUser {
  nsid: NamespacedIdentity;
}

interface CheckCodeProcess {
  nsid: NamespacedIdentity;
  code: number;
}

const generateCodeAndSend = async (params: StartSignProcess) => {
  const authorization = atom<AuthorizationViaEmailWithCode>(
    "ns://authorization/:ulid",
    AUTH_DEFAULT_VALUES,
  );

  const activity = await authorization.do(
    "auth-code-gen-and-send",
    async (ctx) => {
      await ctx.step("check-user-or-create", async (value) => {
        value.email = ctx.params.email;
        const user = await createOrRestoreUser({ email: ctx.params.email });
        value.user = user.nsid;
      });

      await ctx.step("code", async (value) => {
        value.code = await services.generateCode();
        value.codeExpiresAt = Date.now() + 900_000;
        value.expireHours = ctx.params.expireHours || 6;
      });

      await ctx.step("email", async (value) => {
        await services.sendEmail(ctx.params.email, ctx.value.code);
        value.emailSentAt = Date.now();
      });
    },
    params,
  );

  return {
    nsid: authorization.nsid,
    success: activity.value.results?.code?.success || false,
    error: activity.value.results.error?.value || null,
  };
};

const resendCodeForUser = async (params: ResendCodeForUser) => {
  const authorization = atom<AuthorizationViaEmailWithCode>(
    params.nsid,
    AUTH_DEFAULT_VALUES,
  );

  const activity = await authorization.do(
    "auth-code-resend",
    async (ctx) => {
      await ctx.step("check-timing", () => {
        if (
          Date.now() - ctx.value.emailSentAt < 60_000
        ) {
          throw new InvalidStateError(
            "Cannot send code too often, wait 60 seconds",
          );
        }
      });

      await ctx.step("resend-email", async (value) => {
        await services.sendEmail(ctx.value.email, ctx.value.code);
        value.emailSentAt = Date.now();
      });
    },
    params,
  );

  return {
    nsid: authorization.nsid,
    success: activity.value.results?.code?.success || false,
    error: activity.value.results.error?.value || null,
  };
};

const checkCodeAndGenerateJWT = async (params: CheckCodeProcess) => {
  const authorization = atom<AuthorizationViaEmailWithCode>(
    params.nsid,
    AUTH_DEFAULT_VALUES,
  );

  const activity = await authorization.do(
    "auth-check-code-and-gen-jwt",
    async (ctx) => {
      await ctx.step("check-jwt-is-not-generated", (value) => {
        if (value.jwt) {
          throw new InvalidStateError(
            "jwt already generated, can't generate again",
          );
        }
      });

      await ctx.step("check-code-is-not-expired", (value) => {
        if (value.codeExpiresAt <= Date.now()) {
          throw new InvalidStateError(
            "code expired, create new authorization process",
          );
        }
      });

      await ctx.step("fetch-user-and-check-code", async () => {
        const user = await createOrRestoreUser({ email: ctx.value.email });

        await ctx.step("check-code", async (value) => {
          if (ctx.params.code === value.code) {
            await user.do("auth-good-code-given", async (userCtx) => {
              await userCtx.step("update-last-failed-login", (value) => {
                value.meta.lastSuccessLoginAt = Date.now();
                if (!value.meta.activatedAt) {
                  value.meta.activatedAt = Date.now();
                }
              });
            }, {});
          } else {
            await user.do("auth-wrong-code-given", async (userCtx) => {
              await userCtx.step("update-last-failed-login", (value) => {
                value.meta.lastFailLoginAt = Date.now();
              });
            }, {});
            throw new InvalidStateError("given code not match");
          }
        });
      });

      await ctx.step("jwt", async (value) => {
        const jwt = await sign({
          user: value.user,
          email: value.email,
          role: value.email.endsWith("@wdft.ovh")
            ? userRoles.get("superuser")
            : userRoles.get("user"),
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (3600 * ctx.value.expireHours),
        }, JWT_SECRET);

        value.jwt = jwt;
      });
    },
    params,
  );

  return {
    nsid: authorization.nsid,
    success: activity.value.results.jwt?.success || false,
    jwt: authorization.value.jwt,
    error: activity.value.results.error?.value || null,
  };
};

export const app = new Hono<{ Variables: JwtVariables }>();

app.post("/auth/sign", async (c) => {
  const data = await c.req.json();

  const expireHours = ~~(c.req.query("expire_hours") || 10);

  const response = await generateCodeAndSend({
    email: data.email,
    expireHours: expireHours,
  });

  return c.json(response);
});

app.post("/auth/sign/resend", async (c) => {
  const data = await c.req.json();

  const response = await resendCodeForUser({
    nsid: data.nsid,
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

app.get(
  "/auth/authorized/admin",
  assertIsAuthorized,
  assertHasRole(userRoles.get("superuser")),
  (c: Context) => {
    return c.json(c.get("jwtPayload"));
  },
);
