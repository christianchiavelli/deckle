// Decorators run as soon as a class is imported, and they store their metadata
// through the Reflect API this polyfill adds.
import 'reflect-metadata';
import { Logger } from '@nestjs/common';

// Tests provoke warnings on purpose (a malformed event, a refused hook); they assert
// on behaviour, so Nest's default logger stays quiet. Apps under test pass their own.
Logger.overrideLogger(false);
