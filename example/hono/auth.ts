import { type Context, Hono } from "jsr:@hono/hono@^4.5.9";
import { type JwtVariables } from "jsr:@hono/hono/jwt";

// local import normaly from jsr:@worotyns/normal;
import { atom, type NamespacedIdentity } from "../../mod.ts";
import { InvalidStateError } from "../../errors.ts";
import { services } from "./services.ts";
import { createOrRestoreUser, userAtom, userRoles } from "./user.ts";
import { assertHasRole, assertIsAuthorized, createJwtToken } from "./jwt.ts";
import { assert } from "../../utils.ts";
import { restore } from "jsr:@std/testing@^1.0.1/mock";

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
      ctx.value.email = ctx.params.email;
      const user = await createOrRestoreUser({ email: ctx.params.email });
      ctx.value.user = user.nsid;

      ctx.value.code = await services.generateCode();
      ctx.value.codeExpiresAt = Date.now() + 900_000;
      ctx.value.expireHours = ctx.params.expireHours || 6;

      await services.sendEmail(ctx.params.email, ctx.value.code);
      ctx.value.emailSentAt = Date.now();
    },
    params,
  );

  return {
    nsid: authorization.nsid,
    success: activity.value.result.success || false,
    error: activity.value.result.success === false ? activity.value.result.value : null,
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
      if (
        Date.now() - ctx.value.emailSentAt < 60_000
      ) {
        throw new InvalidStateError(
          "Cannot send code too often, wait 60 seconds",
        );
      }

      await services.sendEmail(ctx.value.email, ctx.value.code);
      ctx.value.emailSentAt = Date.now();
    },
    params,
  );

  return {
    nsid: authorization.nsid,
    success: activity.value.result.success || false,
    error: activity.value.result.success === false ? activity.value.result.value : null,
  };
};

const checkCodeAndGenerateJWT = async (params: CheckCodeProcess) => {
  const authorization = atom<AuthorizationViaEmailWithCode>(
    params.nsid,
    AUTH_DEFAULT_VALUES,
  );

  const activity = await authorization.do(
    "auth-check-code-and-gen-jwt",
    async (authCtx) => {
      if (authCtx.value.jwt) {
        throw new InvalidStateError(
          "jwt already generated, can't generate again",
        );
      }

      if (authCtx.value.codeExpiresAt <= Date.now()) {
        throw new InvalidStateError(
          "code expired, create new authorization process",
        );
      }

      // TODO: jak jest z fabryki atomu, to powinnien nie robic persistance i czekac na zapis reszty jako transakcja
      const user = await userAtom(authCtx.value.email).fetch();

      await user.do("update-auth-details", async (userCtx) => {

        if (!userCtx.value.meta.createdAt) {
          userCtx.activity.log('creating new account');
          // email dzieki za rejestracje, czy cos ;D 
          userCtx.value.meta.createdAt = Date.now();
        }

        if (authCtx.params.code === authCtx.value.code) {
          userCtx.value.meta.lastSuccessLoginAt = Date.now();
          if (!userCtx.value.meta.activatedAt) {
            userCtx.value.meta.activatedAt = Date.now();
          }
        } else {
          userCtx.value.meta.lastFailLoginAt = Date.now();
          throw new InvalidStateError("given code not match");
        }          
      }, {})

      assert(authCtx.params.code === authCtx.value.code, "given code not match");

      authCtx.value.jwt = await createJwtToken({
        email: authCtx.value.email,
        user: authCtx.value.user,
        role: authCtx.value.email.endsWith("@wdft.ovh")
          ? userRoles.get("superuser")!
          : userRoles.get("user")!,
        expireHours: authCtx.value.expireHours,
        });
      },
    params,
  );

  const restoredUser = await userAtom(
    authorization.value.email,
  ).fetch();
  
  console.log(activity.version, authorization.version, restoredUser.version);

  return {
    nsid: authorization.nsid,
    success: activity.value.result.success || false,
    jwt: authorization.value.jwt,
    error: activity.value.result.success === false ? activity.value.result.value : null,
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
