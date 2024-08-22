import { sprintf } from "../deps.ts";
import { memory, memory_activity, type Runtime } from "../mod.ts";

const services = {
  email(email: string, subject: string, body: string): Promise<void> {
    console.log(
      sprintf(
        "sending email to %s with subject %s and body %s",
        email,
        subject,
        body,
      ),
    );
    return Promise.resolve();
  },
  code(): Promise<string> {
    const code = (Math.random() * 1000000).toFixed();
    console.log(sprintf("generated code %s", code));
    return Promise.resolve(code);
  },
};

export const testing: Runtime<typeof services> = {
  secret: "secret",
  repository: memory,
  services: services,
  activity: memory_activity,
};
