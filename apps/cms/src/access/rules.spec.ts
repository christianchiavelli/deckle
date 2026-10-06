import type { AccessArgs, FieldAccessArgs, PayloadRequest } from 'payload';
import { describe, expect, it } from 'vitest';
import type { Role } from './policy';
import {
  administer,
  administerField,
  administerJobs,
  anyone,
  readContent,
  readUsers,
  updateUsers,
  useAdminPanel,
  writeContent,
} from './rules';

const requestFrom = (role: Role | null, id = 7) =>
  ({ user: role ? { id, role, collection: 'users' } : null }) as unknown as PayloadRequest;

const args = (role: Role | null): AccessArgs => ({ req: requestFrom(role) });
const fieldArgs = (role: Role | null): FieldAccessArgs => ({ req: requestFrom(role) });

describe('content access', () => {
  it('lets every role read, drafts included, and nobody signed out', () => {
    expect(readContent(args('admin'))).toBe(true);
    expect(readContent(args('editor'))).toBe(true);
    expect(readContent(args('gateway'))).toBe(true);
    expect(readContent(args(null))).toBe(false);
  });

  it('lets admins and editors write, never the gateway', () => {
    expect(writeContent(args('admin'))).toBe(true);
    expect(writeContent(args('editor'))).toBe(true);
    expect(writeContent(args('gateway'))).toBe(false);
    expect(writeContent(args(null))).toBe(false);
  });

  it('publishes editorial images to anyone', () => {
    expect(anyone(args(null))).toBe(true);
  });
});

describe('administration', () => {
  it('belongs to admins alone', () => {
    expect(administer(args('admin'))).toBe(true);
    expect(administer(args('editor'))).toBe(false);
    expect(administerField(fieldArgs('admin'))).toBe(true);
    expect(administerField(fieldArgs('editor'))).toBe(false);
    expect(administerJobs({ req: requestFrom('admin') })).toBe(true);
    expect(administerJobs({ req: requestFrom('gateway') })).toBe(false);
  });

  it('keeps the gateway out of the admin panel', () => {
    expect(useAdminPanel({ req: requestFrom('admin') })).toBe(true);
    expect(useAdminPanel({ req: requestFrom('editor') })).toBe(true);
    expect(useAdminPanel({ req: requestFrom('gateway') })).toBe(false);
    expect(useAdminPanel({ req: requestFrom(null) })).toBe(false);
  });
});

describe('user access', () => {
  it('shows admins every user and anyone else only themselves', () => {
    expect(readUsers(args('admin'))).toBe(true);
    expect(readUsers(args('editor'))).toEqual({ id: { equals: 7 } });
    expect(readUsers(args('gateway'))).toEqual({ id: { equals: 7 } });
    expect(readUsers(args(null))).toBe(false);
  });

  it('lets editors change their own account and the gateway nothing', () => {
    expect(updateUsers(args('admin'))).toBe(true);
    expect(updateUsers(args('editor'))).toEqual({ id: { equals: 7 } });
    expect(updateUsers(args('gateway'))).toBe(false);
    expect(updateUsers(args(null))).toBe(false);
  });
});
