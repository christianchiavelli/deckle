import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { HealthIndicators } from './health.indicators.js';

/**
 * One endpoint, read as readiness: 503 only when the gateway cannot do its own
 * job (its database is gone). A slow or missing upstream turns the answer
 * `degraded` with a 200, so the container stays in rotation and the cause shows.
 */
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly indicators: HealthIndicators,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.indicators.database(),
      () => this.indicators.eventListener(),
      () => this.indicators.upstream('commerce'),
      () => this.indicators.upstream('cms'),
    ]);
  }
}
