import type { Access, FieldAccess, PayloadRequest, Where } from 'payload';
import { can, type Capability } from './policy';

/** Payload's access functions, each a thin reading of the policy table. */

const allow =
  (capability: Capability): Access =>
  ({ req }) =>
    can(req.user, capability);

const allowField =
  (capability: Capability): FieldAccess =>
  ({ req }) =>
    can(req.user, capability);

export const readContent = allow('readContent');
export const writeContent = allow('writeContent');
export const administer = allow('administer');
export const administerField = allowField('administer');

/** Editorial images are published as they are; there is no draft of a file. */
export const anyone: Access = () => true;

export const useAdminPanel = ({ req }: { req: PayloadRequest }): boolean =>
  can(req.user, 'useAdminPanel');

/** The jobs queue's own access hooks take only the request. */
export const administerJobs = ({ req }: { req: PayloadRequest }): boolean =>
  can(req.user, 'administer');

const onlyThemselves = (id: number | string): Where => ({ id: { equals: id } });

/** Admins see every user; anyone else sees only their own account. */
export const readUsers: Access = ({ req: { user } }) => {
  if (!user) {
    return false;
  }
  return can(user, 'administer') ? true : onlyThemselves(user.id);
};

/** Editors keep their own account up to date; the gateway's user changes nothing. */
export const updateUsers: Access = ({ req: { user } }) => {
  if (can(user, 'administer')) {
    return true;
  }
  return user && can(user, 'writeContent') ? onlyThemselves(user.id) : false;
};
