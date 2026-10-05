/** Resolves after `ms`. Built on the global timer so that tests can drive it with fake timers. */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
