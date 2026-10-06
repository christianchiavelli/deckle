import { z } from 'zod';

/**
 * Text an upstream may leave out. Editors and admin forms keep an emptied field
 * as `""`, which means "not recorded" as much as `null` does, so both become `null`.
 */
export const optionalText = z
  .string()
  .nullish()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed === undefined || trimmed === '' ? null : trimmed;
  });

/** Text the contract guarantees. */
export const requiredText = z.string().trim().min(1);

/** An optional whole number, such as a year. */
export const optionalInt = z
  .int()
  .nullish()
  .transform((value) => value ?? null);
