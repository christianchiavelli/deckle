export const roles = ['admin', 'editor', 'gateway'] as const;

export type Role = (typeof roles)[number];

/** The part of a signed-in user that access decisions read. */
export interface Viewer {
  readonly id: number | string;
  readonly role: Role;
}

/**
 * Who may do what, in one table. Editors write content; the gateway's user
 * only reads it, drafts included, so the store can preview; admins also run
 * the place: users, API keys and the jobs queue.
 */
const policy = {
  readContent: ['admin', 'editor', 'gateway'],
  writeContent: ['admin', 'editor'],
  useAdminPanel: ['admin', 'editor'],
  administer: ['admin'],
} as const satisfies Record<string, readonly Role[]>;

export type Capability = keyof typeof policy;

export function can(viewer: Viewer | null | undefined, capability: Capability): boolean {
  if (!viewer) {
    return false;
  }
  const allowed: readonly Role[] = policy[capability];
  return allowed.includes(viewer.role);
}
