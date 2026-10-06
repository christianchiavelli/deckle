import { Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';

/**
 * The last line a clean stop writes, once connections have drained and the pools
 * have closed. A log that ends without it belongs to a process that was killed.
 */
@Injectable()
export class ShutdownLog implements OnApplicationShutdown {
  private readonly logger = new Logger('Shutdown');

  onApplicationShutdown(signal?: string) {
    this.logger.log(signal === undefined ? 'Stopped' : `Stopped after ${signal}`);
  }
}
