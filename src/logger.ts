import * as Minilog from 'minilog';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

export class Logger {
  private readonly name = 'devour-client-ts';
  private readonly logger: Minilog;

  constructor() {
    if (!this.logger) {
      this.logger = Minilog(this.name);
    }
  }

  static setLogLevel(loglevel: LogLevel) {
    this.instantiate().setLogLevel(loglevel);
  }

  static disable() {
    Minilog.disable();
  }

  static enable() {
    Minilog.enable();
  }

  static instantiate() {
    return new Logger();
  }

  static debug(message) {
    this.instantiate().debug(message);
  }

  static error(message) {
    this.instantiate().error(message);
  }

  static info(message) {
    this.instantiate().info(message);
  }

  static warn(message) {
    this.instantiate().warn(message);
  }

  private info(message) {
    this.logger.info(message);
  }

  private warn(message) {
    this.logger.warn(message);
  }

  private error(message) {
    this.logger.error(message);
  }

  private debug(message) {
    this.logger.debug(message);
  }

  private setLogLevel(loglevel: LogLevel) {
    if (loglevel.valueOf() >= LogLevel.NONE.valueOf()) {
      Minilog.disable();
      return;
    }
    const filter = new Minilog.Filter();
    if (loglevel.valueOf() >= LogLevel.ERROR.valueOf()) {
      filter.deny(this.name, 'warn');
    }
    if (loglevel.valueOf() >= LogLevel.WARN.valueOf()) {
      filter.deny(this.name, 'info');
    }
    if (loglevel.valueOf() >= LogLevel.INFO.valueOf()) {
      filter.deny(this.name, 'debug');
    }
    Minilog.pipe(filter) // filter
      .pipe(Minilog.defaultFormatter) // formatter
      .pipe(Minilog.defaultBackend); // backend - e.g. the console
  }
}
