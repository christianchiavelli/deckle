import type { FieldHook, TypeWithID } from 'payload';

/**
 * An optional text an editor left empty is stored as `null`, never `""`, so a
 * reader can tell "not written" from a value and show a dash.
 */
export const blankToNull: FieldHook<TypeWithID, string | null | undefined> = ({ value }) =>
  typeof value === 'string' && value.trim() === '' ? null : value;
