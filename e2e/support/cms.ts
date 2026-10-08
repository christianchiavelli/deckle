import path from 'node:path';

export const cms = process.env['CMS_URL'] ?? 'http://localhost:8081';

/** The editor the CMS's seed creates. */
export const editor = {
  email: process.env['CMS_ADMIN_EMAIL'] ?? 'editor@deckle.localhost',
  password: process.env['CMS_ADMIN_PASSWORD'] ?? 'deckle-editor',
};

/**
 * The editor's signed-in cookies, which cms-editor.setup.ts writes once for
 * every test that edits. Payload keeps a user's sessions in one row and adds
 * each sign-in by rewriting it, so two at once can lose one of them.
 */
export const EDITOR_STATE = path.join(import.meta.dirname, '..', '.auth', 'editor.json');
