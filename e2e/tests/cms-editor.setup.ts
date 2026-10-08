import { expect, test as setup } from '@playwright/test';
import { cms, EDITOR_STATE, editor } from '../support/cms.js';

setup('signs the CMS editor in, once for every test that edits', async ({ request }) => {
  const signedIn = await request.post(`${cms}/api/users/login`, { data: editor });
  expect(signedIn.ok()).toBe(true);
  await request.storageState({ path: EDITOR_STATE });
});
