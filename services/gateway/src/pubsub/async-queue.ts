/**
 * An async iterator fed by pushes: what a GraphQL subscription reads its events
 * from. It holds at most `capacity` unread events; past that a slow reader loses
 * the oldest, never the newest, since each event announces the latest state.
 */
export class AsyncQueue<T> implements AsyncIterableIterator<T> {
  // Boxed, so an event whose value is `undefined` is still an event.
  private readonly buffered: { readonly value: T }[] = [];
  private readonly readers: ((result: IteratorResult<T>) => void)[] = [];
  private closed = false;

  constructor(
    private readonly capacity: number,
    private readonly onClose: () => void,
    private readonly onOverflow: () => void = () => undefined,
  ) {}

  push(value: T): void {
    if (this.closed) return;
    const reader = this.readers.shift();
    if (reader !== undefined) {
      reader({ value, done: false });
      return;
    }
    if (this.buffered.length >= this.capacity) {
      this.buffered.shift();
      this.onOverflow();
    }
    this.buffered.push({ value });
  }

  next(): Promise<IteratorResult<T>> {
    const event = this.buffered.shift();
    if (event !== undefined) return Promise.resolve({ value: event.value, done: false });
    if (this.closed) return Promise.resolve({ value: undefined, done: true });
    return new Promise((resolve) => this.readers.push(resolve));
  }

  /** Called when the subscriber goes away; stops delivery and releases the listener. */
  return(): Promise<IteratorResult<T>> {
    this.close();
    return Promise.resolve({ value: undefined, done: true });
  }

  throw(error: unknown): Promise<IteratorResult<T>> {
    this.close();
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  }

  [Symbol.asyncIterator](): this {
    return this;
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.buffered.length = 0;
    for (const reader of this.readers.splice(0)) reader({ value: undefined, done: true });
    this.onClose();
  }
}
