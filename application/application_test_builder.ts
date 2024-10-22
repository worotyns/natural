import type { Client, ApplicationBuilder } from "./application_builder.ts";
import { clearStorage, dumpStorage } from "../repository.ts";

export class TestBuilder {
  static create(clientBuilder: ApplicationBuilder) {
    return new TestBuilder(clientBuilder);
  }

  private client: Client;
  private _debug: boolean = false;
  constructor(builder: ApplicationBuilder) {
    this.client = builder.build();
  }

  debug(): this {
    this._debug = true;
    return this;
  }

  async run(callback: (client: Client) => Promise<void>) {
    await this.clean();
    await callback(this.client);
    if (this._debug) {
      dumpStorage();
    }
  }

  clean() {
    return clearStorage();
  }
}
