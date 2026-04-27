import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { type Listener } from '@ngrok/ngrok';

import type * as NgrokModule from '@ngrok/ngrok';

@Injectable()
export class NgrokIngressService implements OnApplicationShutdown {
  private readonly logger = new Logger(`NgrokIngress`);
  private listener: Listener | null = null;
  private starting: Promise<Listener | null> | null = null;
  private ngrokClientPromise: Promise<typeof NgrokModule> | null = null;

  isActive() {
    return this.listener !== null;
  }

  getListenerUrl() {
    return this.listener?.url() ?? null;
  }

  private async getNgrokClient(): Promise<typeof NgrokModule> {
    if (!this.ngrokClientPromise) {
      this.ngrokClientPromise = import(`@ngrok/ngrok`);
    }
    return this.ngrokClientPromise;
  }

  async startIfEnabled(opts: { port: number; authtoken: string; domain: string }): Promise<Listener | null> {
    if (this.listener) return this.listener;
    if (this.starting) return this.starting;

    this.starting = (async () => {
      try {
        const ngrok = await this.getNgrokClient();
        await ngrok.disconnect(); // defensive cleanup

        this.listener = await ngrok.forward({
          addr: opts.port,
          authtoken: opts.authtoken,
          domain: opts.domain,
          compression: false,
          force_new_session: false,
        });

        if (this.listener) {
          this.logger.log(`Ingress ngrok established at: ${this.listener.url()}`);
        }

        return this.listener;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        this.listener = null;

        this.logger.warn(`⚠️  Ingress ngrok unavailable: ${msg}`);

        return null;
      } finally {
        this.starting = null;
      }
    })();

    return this.starting;
  }

  async onApplicationShutdown() {
    try {
      if (this.listener) {
        const ngrok = await this.getNgrokClient();
        const url = this.listener.url();
        await this.listener.close();
        await ngrok.disconnect(url);
        this.listener = null;
      }
    } catch {
      // Ignore shutdown errors so app termination can continue.
    }
  }
}
