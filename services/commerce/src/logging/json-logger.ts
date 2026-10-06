import { LogLevel, type VendureLogger } from '@vendure/core';

const levelNames: Record<LogLevel, string> = {
  [LogLevel.Error]: 'error',
  [LogLevel.Warn]: 'warn',
  [LogLevel.Info]: 'info',
  [LogLevel.Verbose]: 'verbose',
  [LogLevel.Debug]: 'debug',
};

export type LogSink = (line: string, level: LogLevel) => void;

const writeToStdio: LogSink = (line, level) => {
  (level <= LogLevel.Warn ? process.stderr : process.stdout).write(`${line}\n`);
};

/**
 * One JSON object per line, for whatever collects container output. Vendure's
 * `DefaultLogger` writes coloured text meant for a terminal, which is what
 * development keeps using.
 */
export class JsonLogger implements VendureLogger {
  private defaultContext: string | undefined;

  constructor(
    private readonly options: { level: LogLevel; process: string },
    private readonly sink: LogSink = writeToStdio,
  ) {}

  setDefaultContext(defaultContext: string): void {
    this.defaultContext = defaultContext;
  }

  error(message: string, context?: string, trace?: string): void {
    this.write(LogLevel.Error, message, context, trace);
  }

  warn(message: string, context?: string): void {
    this.write(LogLevel.Warn, message, context);
  }

  info(message: string, context?: string): void {
    this.write(LogLevel.Info, message, context);
  }

  verbose(message: string, context?: string): void {
    this.write(LogLevel.Verbose, message, context);
  }

  debug(message: string, context?: string): void {
    this.write(LogLevel.Debug, message, context);
  }

  private write(level: LogLevel, message: string, context?: string, trace?: string): void {
    if (level > this.options.level) {
      return;
    }
    const entry = {
      time: new Date().toISOString(),
      level: levelNames[level],
      service: 'commerce',
      process: this.options.process,
      context: context ?? this.defaultContext ?? null,
      message,
      ...(trace === undefined ? {} : { trace }),
    };
    this.sink(JSON.stringify(entry), level);
  }
}
