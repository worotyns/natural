import { memory, memory_activity, type Runtime } from "../lib/mod.ts";

const services = {
  email(email: string, subject: string, body: string): Promise<void> {
    console.log(
      "sending email to with subject and body", {
        email,
        subject,
        body,
      }
    );
    return Promise.resolve();
  },
  code(): Promise<string> {
    const code = (Math.random() * 1000000).toFixed();
    console.log("generated code ", code);
    return Promise.resolve(code);
  },
};

export const testing: Runtime<typeof services> = {
  secret: "secret",
  repository: memory,
  services: services,
  activity: memory_activity,
};
