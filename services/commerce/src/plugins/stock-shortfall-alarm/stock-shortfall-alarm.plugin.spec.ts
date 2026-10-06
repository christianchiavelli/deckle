import { Logger, Order, RequestContext, StockShortfallEvent, type EventBus } from '@vendure/core';
import { describe, expect, it, vi } from 'vitest';
import { describeShortfall, StockShortfallAlarmPlugin } from './stock-shortfall-alarm.plugin.js';

const event = new StockShortfallEvent(
  RequestContext.empty(),
  new Order({ id: 41, code: 'DK7Q2M', state: 'PaymentSettled' }),
  [
    { productVariantId: 7, orderLineId: 90, requested: 2, allocated: 1 },
    { productVariantId: 8, orderLineId: 91, requested: 1, allocated: 0 },
  ],
);

describe('describeShortfall', () => {
  it('names the order and every line that came up short', () => {
    expect(describeShortfall(event)).toBe(
      'Stock shortfall on order DK7Q2M (id 41, state PaymentSettled): ' +
        'variant 7 (order line 90): 2 requested, 1 allocated; ' +
        'variant 8 (order line 91): 1 requested, 0 allocated. ' +
        "A drop has oversold past the gateway's lock.",
    );
  });
});

describe('StockShortfallAlarmPlugin', () => {
  it('logs every shortfall at error level until the module is destroyed', () => {
    const handlers: ((event: StockShortfallEvent) => void)[] = [];
    const unsubscribe = vi.fn();
    const bus = {
      ofType: (type: unknown) => {
        expect(type).toBe(StockShortfallEvent);
        return {
          subscribe: (handler: (event: StockShortfallEvent) => void) => {
            handlers.push(handler);
            return { unsubscribe };
          },
        };
      },
    };
    const errors = vi.spyOn(Logger, 'error').mockImplementation(() => undefined);

    const plugin = new StockShortfallAlarmPlugin(bus as unknown as EventBus);
    plugin.onApplicationBootstrap();
    handlers.forEach((handler) => {
      handler(event);
    });
    plugin.onModuleDestroy();

    expect(errors).toHaveBeenCalledWith(describeShortfall(event), 'StockShortfallAlarm');
    expect(unsubscribe).toHaveBeenCalledOnce();
    errors.mockRestore();
  });
});
