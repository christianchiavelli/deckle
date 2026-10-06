import { describe, expect, it } from 'vitest';
import { can, type Capability, type Role } from './policy';

const viewer = (role: Role) => ({ id: 1, role });

describe('can', () => {
  it.each<[Role, Capability, boolean]>([
    ['admin', 'readContent', true],
    ['admin', 'writeContent', true],
    ['admin', 'useAdminPanel', true],
    ['admin', 'administer', true],
    ['editor', 'readContent', true],
    ['editor', 'writeContent', true],
    ['editor', 'useAdminPanel', true],
    ['editor', 'administer', false],
    ['gateway', 'readContent', true],
    ['gateway', 'writeContent', false],
    ['gateway', 'useAdminPanel', false],
    ['gateway', 'administer', false],
  ])('lets %s %s: %s', (role, capability, allowed) => {
    expect(can(viewer(role), capability)).toBe(allowed);
  });

  it('lets nobody signed out do anything', () => {
    expect(can(null, 'readContent')).toBe(false);
    expect(can(undefined, 'readContent')).toBe(false);
  });
});
