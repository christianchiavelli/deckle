import type { Payload, TaskConfig } from 'payload';
import { type DeliveryTarget, deliverEvent } from './deliver';
import { cmsEventSchema } from './event';

export const deliverCmsEventTaskSlug = 'deliver-cms-event';
export const cmsEventsQueue = 'cms-events';

interface DeliverCmsEventIO {
  input: { event: unknown };
  output: { status: number };
}

/**
 * Sends one queued event to the gateway. A failure throws, and Payload runs
 * the job again later with exponential backoff: 2 s, 4 s, 8 s and so on, ten
 * times, about half an hour in all, which outlasts a gateway restart.
 */
export function deliverCmsEventTask(target: DeliveryTarget): TaskConfig<DeliverCmsEventIO> {
  return {
    slug: deliverCmsEventTaskSlug,
    label: 'Deliver a CMS event to the gateway',
    inputSchema: [{ name: 'event', type: 'json', required: true }],
    outputSchema: [{ name: 'status', type: 'number', required: true }],
    retries: { attempts: 10, backoff: { type: 'exponential', delay: 2_000 } },
    handler: async ({ input, req }) => {
      const event = cmsEventSchema.parse(input.event);
      const { status } = await deliverEvent(event, target);
      req.payload.logger.info({
        msg: 'Delivered a cms event to the gateway',
        eventId: event.id,
        type: event.type,
        action: event.action,
        status,
      });
      return { output: { status } };
    },
  };
}

/**
 * Hands deliveries that were running when the process stopped back to the
 * queue. Payload marks a job as processing while it runs and never times that
 * out, so without this a crash mid-delivery would lose the event. One process
 * runs this queue, so at start-up nothing of it can genuinely be in flight.
 */
export async function releaseInterruptedDeliveries(payload: Payload): Promise<void> {
  await payload.db.updateJobs({
    where: {
      and: [{ taskSlug: { equals: deliverCmsEventTaskSlug } }, { processing: { equals: true } }],
    },
    data: { processing: false },
    returning: false,
  });
}
