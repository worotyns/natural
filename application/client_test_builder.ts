import type { Client, ClientBuilder } from "./client_builder.ts";
import { clearStorage, dumpStorage } from "../repository.ts";

export class TestBuilder {
  static create(clientBuilder: ClientBuilder) {
    return new TestBuilder(clientBuilder);
  }

  private client: Client;
  private _debug: boolean = false;
  constructor(builder: ClientBuilder) {
    this.client = builder.build();
  }

  debug(): this {
    this._debug = true;
    return this;
  }

  // create builder like style for run and move debug, clean commands inside
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
