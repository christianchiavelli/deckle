/** A copy of `object` without `key`, as a source that leaves the field out would send it. */
export function without<T extends object, K extends keyof T & string>(
  object: T,
  key: K,
): Omit<T, K> {
  return Object.fromEntries(Object.entries(object).filter(([name]) => name !== key)) as Omit<T, K>;
}
