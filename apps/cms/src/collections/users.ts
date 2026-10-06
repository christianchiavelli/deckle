import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload';
import { type Role, roles } from '../access/policy';
import {
  administer,
  administerField,
  readUsers,
  updateUsers,
  useAdminPanel,
} from '../access/rules';

const roleLabels: Record<Role, string> = {
  admin: 'Admin',
  editor: 'Editor',
  gateway: 'Gateway (read only)',
};

/**
 * Whoever registers first through the admin's create-first-user screen is the
 * admin, whatever the form sent: otherwise a fresh database could end up with
 * an editor and nobody able to manage users.
 */
const firstUserIsAdmin: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== 'create') {
    return data;
  }
  const { totalDocs } = await req.payload.count({ collection: 'users', req });
  return totalDocs === 0 ? { ...data, role: 'admin' } : data;
};

export const users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'role', 'updatedAt'],
  },
  auth: {
    // The gateway's user reads through an API key; people sign in with a password.
    useAPIKey: true,
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
  },
  access: {
    admin: useAdminPanel,
    create: administer,
    read: readUsers,
    update: updateUsers,
    delete: administer,
    unlock: administer,
  },
  hooks: {
    beforeChange: [firstUserIsAdmin],
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      options: roles.map((role) => ({ label: roleLabels[role], value: role })),
      access: { create: administerField, update: administerField },
      admin: {
        description: "Editors write content. The gateway role is the store's read-only API user.",
      },
    },
    {
      // Payload lets anyone with admin-panel access manage API keys; here only admins do.
      name: 'apiKey',
      type: 'text',
      access: { create: administerField, update: administerField },
    },
  ],
};
