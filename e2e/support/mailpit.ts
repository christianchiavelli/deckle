import { expect } from '@playwright/test';

const mailpit = process.env['MAILPIT_URL'] ?? 'http://localhost:8025';

interface Found {
  readonly messages: readonly { readonly Subject: string }[];
}

/**
 * The subject of the mail sent to `address`, once commerce's worker has sent
 * it: the receipts leave through a job queue, a moment after the order.
 */
export async function receiptFor(address: string): Promise<string> {
  let subject = '';
  await expect
    .poll(
      async () => {
        const response = await fetch(
          `${mailpit}/api/v1/search?query=${encodeURIComponent(`to:"${address}"`)}`,
        );
        const found = (await response.json()) as Found;
        subject = found.messages[0]?.Subject ?? '';
        return subject;
      },
      { message: `a mail to ${address}`, timeout: 20_000 },
    )
    .not.toBe('');
  return subject;
}
