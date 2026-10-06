import { Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';

@Injectable()
class Clock {
  now() {
    return 42;
  }
}

@Injectable()
class Greeter {
  constructor(readonly clock: Clock) {}
}

describe('the test toolchain', () => {
  it('records constructor types, so Nest injects by type without @Inject()', async () => {
    expect(Reflect.getMetadata('design:paramtypes', Greeter)).toEqual([Clock]);

    const moduleRef = await Test.createTestingModule({ providers: [Clock, Greeter] }).compile();

    expect(moduleRef.get(Greeter).clock.now()).toBe(42);
  });
});
