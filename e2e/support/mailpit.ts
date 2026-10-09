import { expect } from '@playwright/test';

const mailpit = process.env['MAILPIT_URL'] ?? 'http://localhost:8025';

interface Found {
  readonly messages: readonly { readonly ID: string; readonly Subject: string }[];
}

export interface Mail {
  readonly subject: string;
  readonly html: string;
}

/**
 * The mail sent to `address`, once commerce's worker has sent it: the receipts
 * leave through a job queue, a moment after the order.
 */
export async function receiptFor(address: string): Promise<Mail> {
  let found: Found['messages'][number] | undefined;
  await expect
    .poll(
      async () => {
        const response = await fetch(
          `${mailpit}/api/v1/search?query=${encodeURIComponent(`to:"${address}"`)}`,
        );
        [found] = ((await response.json()) as Found).messages;
        return found?.ID ?? '';
      },
      { message: `a mail to ${address}`, timeout: 20_000 },
    )
    .not.toBe('');
  const id = found?.ID ?? '';
  const message = (await (await fetch(`${mailpit}/api/v1/message/${id}`)).json()) as {
    HTML: string;
  };
  return { subject: found?.Subject ?? '', html: message.HTML };
}
