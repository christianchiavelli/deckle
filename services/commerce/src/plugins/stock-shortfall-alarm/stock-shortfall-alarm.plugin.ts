import type { OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import {
  EventBus,
  Logger,
  PluginCommonModule,
  StockShortfallEvent,
  VendurePlugin,
} from '@vendure/core';

const loggerCtx = 'StockShortfallAlarm';

/** The alarm's text: everything Vendure knows about the shortfall, on one line. */
export function describeShortfall(event: StockShortfallEvent): string {
  const lines = event.shortfalls
    .map(
      (shortfall) =>
        `variant ${String(shortfall.productVariantId)} (order line ${String(shortfall.orderLineId)}): ` +
        `${shortfall.requested} requested, ${shortfall.allocated} allocated`,
    )
    .join('; ');
  return (
    `Stock shortfall on order ${event.order.code} (id ${String(event.order.id)}, ` +
    `state ${event.order.state}): ${lines}. A drop has oversold past the gateway's lock.`
  );
}

/**
 * Vendure 3.7.4 caps an allocation at the stock left and publishes this event instead
 * of overselling. In Deckle the gateway's drop lock should make that impossible, so
 * the event firing at all means the first barrier failed: it is logged at error level
 * for whoever watches the logs, and nothing else is done.
 */
@VendurePlugin({
  imports: [PluginCommonModule],
  compatibility: '^3.7.4',
})
export class StockShortfallAlarmPlugin implements OnApplicationBootstrap, OnModuleDestroy {
  private subscription: { unsubscribe(): void } | undefined;

  constructor(private readonly eventBus: EventBus) {}

  onApplicationBootstrap(): void {
    this.subscription = this.eventBus.ofType(StockShortfallEvent).subscribe((event) => {
      Logger.error(describeShortfall(event), loggerCtx);
    });
  }

  onModuleDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
