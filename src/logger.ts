import * as Minilog from 'minilog';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

export class Logger {
  private static readonly LOGGER_NAME = 'devour-client-ts';
  private readonly logger: Minilog;

  constructor() {
    if (!this.logger) {
      this.logger = Minilog(Logger.LOGGER_NAME);
    }
  }

  static setLogLevel(loglevel: LogLevel | string) {
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

  private setLogLevel(loglevel: LogLevel | string) {
    if (typeof loglevel === 'string') {
      loglevel = LogLevel[loglevel.toUpperCase()];
    }
    if (loglevel.valueOf() >= LogLevel.NONE.valueOf()) {
      Logger.disable();
      return;
    }
    if (loglevel.valueOf() >= LogLevel.ERROR.valueOf()) {
      Minilog.suggest.deny(Logger.LOGGER_NAME, 'warn');
    }
    if (loglevel.valueOf() >= LogLevel.WARN.valueOf()) {
      Minilog.suggest.deny(Logger.LOGGER_NAME, 'info');
    }
    if (loglevel.valueOf() >= LogLevel.INFO.valueOf()) {
      Minilog.suggest.deny(Logger.LOGGER_NAME, 'debug');
    }
  }
}
